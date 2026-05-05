import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { canUploadProjectDocuments, canEditOwnDocumentBeforeFinalApproval, canEditDocumentStatusAtAnyStage } from "@/lib/rbac";
import { transitionDocumentState } from "./document-state-service";
import { logDocumentActivity } from "./activity-service";
import { notifyUsers, getProjectMembersByRoles } from "./notification-service";
import { recordDocumentReviewEvent } from "./review-service";
import { aiService } from "./ai-service";
import { documentIntelligenceService } from "./document-intelligence-service";
import { eventBus } from "@/lib/events/event-bus";
import type { CurrentUser } from "@/lib/types";

export class DocumentService {
  private get client() { return createClient(); }
  private get admin() { return env.supabaseServiceRoleKey ? createAdminClient() : this.client; }
  private isL0Role(role: string) {
    return ["consultant", "architect", "mep", "contractor"].includes(String(role).toLowerCase());
  }

  private async getActorProjectRole(projectId: string, user: CurrentUser) {
    if (user.role === "super_user") return "super_user";
    const { data: membership } = await this.client
      .from("project_users")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    return membership?.role ?? user.role;
  }

  private async getClientUserForProject(projectId: string) {
    const { data } = await this.admin
      .from("project_users")
      .select("user_id")
      .eq("project_id", projectId)
      .eq("role", "client")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return data?.user_id ?? null;
  }

  private async getProjectCreditAssignment(projectCreditId: string) {
    const { data, error } = await this.admin
      .from("project_credits")
      .select("*")
      .eq("id", projectCreditId)
      .maybeSingle();
    if (error) throw error;
    return data as any;
  }

  private async resolveCreditStageId(params: {
    projectCreditId: string;
    creditId: string;
  }) {
    const { projectCreditId, creditId } = params;
    const preferredStages = ["DESIGN", "CONSTRUCTION"];

    const { data: existingByProjectCredit } = await this.admin
      .from("credit_stages")
      .select("id, stage")
      .eq("project_credit_id", projectCreditId)
      .order("created_at", { ascending: true });

    const rankedExisting =
      (existingByProjectCredit ?? []).sort((a: any, b: any) => {
        const rankA = preferredStages.indexOf(String(a.stage ?? "").toUpperCase());
        const rankB = preferredStages.indexOf(String(b.stage ?? "").toUpperCase());
        return (rankA === -1 ? 99 : rankA) - (rankB === -1 ? 99 : rankB);
      }) ?? [];

    if (rankedExisting[0]?.id) {
      return rankedExisting[0].id as string;
    }

    const { data: seededStage, error: seedError } = await this.admin
      .from("credit_stages")
      .insert({
        project_credit_id: projectCreditId,
        credit_id: creditId,
        stage: "DESIGN",
        state: "DRAFT",
      })
      .select("id")
      .single();

    if (seedError || !seededStage?.id) {
      throw new Error(
        seedError?.message ??
          "Unable to create credit stage for this mapped credit. Please contact Project Admin.",
      );
    }

    return seededStage.id as string;
  }

  private assertL0AssignmentAccess(args: {
    actorRole: string;
    actorUserId: string;
    mappedCredit: any;
  }) {
    if (!this.isL0Role(args.actorRole)) return;
    const assignedUserId = args.mappedCredit?.assigned_user_id as string | null;
    const responsibleRole = String(args.mappedCredit?.responsible_role ?? "").toLowerCase().trim();
    if (assignedUserId && assignedUserId !== args.actorUserId) {
      throw new Error("This credit is assigned to a different owner. Only the assigned owner can upload or update here.");
    }
    if (!assignedUserId && responsibleRole && responsibleRole !== String(args.actorRole).toLowerCase()) {
      throw new Error(`This credit is mapped to ${responsibleRole}. Your role cannot upload or update here.`);
    }
  }

  async uploadDocument(user: CurrentUser, params: {
    projectId: string;
    creditId: string;
    projectCreditId?: string;
    docCategory: string;
    requirementSlot?: string;
    notes?: string;
    file: File;
  }) {
    const actorRole = await this.getActorProjectRole(params.projectId, user);
    if (!actorRole || !canUploadProjectDocuments(actorRole as any)) {
      throw new Error("Unauthorized: You do not have upload access for this project.");
    }

    let projectCreditId = params.projectCreditId;
    if (!projectCreditId) {
      const { data: mappedProjectCredit } = await this.admin
        .from("project_credits")
        .select("id")
        .eq("project_id", params.projectId)
        .eq("credit_id", params.creditId)
        .maybeSingle();
      projectCreditId = mappedProjectCredit?.id;
    }

    if (!projectCreditId) {
      throw new Error("Project credit mapping not found.");
    }

    const mappedCredit = await this.getProjectCreditAssignment(projectCreditId);
    if (!mappedCredit) {
      throw new Error("Mapped project credit is missing.");
    }

    // P1 enforcement: L0 uploader must match assignment on this mapped credit.
    this.assertL0AssignmentAccess({
      actorRole: String(actorRole),
      actorUserId: user.id,
      mappedCredit,
    });

    const validation = await aiService.validateUploadCandidate({
      projectId: params.projectId,
      creditId: params.creditId,
      projectCreditId: projectCreditId,
      fileName: params.file.name,
      fileType: params.file.type,
      fileSize: params.file.size,
      docCategory: params.docCategory,
    });
    if (!validation.ok) {
      throw new Error(validation.errors.join(" "));
    }

    const clientUserId = await this.getClientUserForProject(params.projectId);
    if (!clientUserId) {
      throw new Error("Client wallet is not linked for this project yet.");
    }

    // Quota check
    const { data: usage } = await this.admin
      .from("project_usage_summary")
      .select("documents_used, document_credit_limit, topup_document_credits")
      .eq("project_id", params.projectId)
      .maybeSingle();

    const allowedDocuments = Number(usage?.document_credit_limit ?? 0) + Number(usage?.topup_document_credits ?? 0);
    const usedDocuments = Number(usage?.documents_used ?? 0);
    if (allowedDocuments > 0 && usedDocuments >= allowedDocuments) {
      throw new Error("Document credit limit reached for this project plan.");
    }

    // Submittal Management (Execution Unit)
    const creditStageId = await this.resolveCreditStageId({
      projectCreditId,
      creditId: params.creditId,
    });

    const { data: activeSubmittal, error: subError } = await this.admin
      .from("submittals")
      .select("id")
      .eq("credit_stage_id", creditStageId)
      .in("state", ["DRAFT", "READY", "CLARIFICATION"])
      .order("iteration", { ascending: false })
      .limit(1)
      .maybeSingle();

    let submittalId = activeSubmittal?.id;

    if (!submittalId) {
      // Create a new submittal round if none are active
      const { data: newSubmittal, error: createSubError } = await this.admin
        .from("submittals")
        .insert({
          credit_stage_id: creditStageId,
          project_id: params.projectId,
          credit_id: params.creditId,
          name: "Active Work Round",
          type: params.docCategory,
          state: "DRAFT",
          iteration: 1,
          created_by: user.id
        })
        .select("id")
        .single();
      
      if (createSubError) throw createSubError;
      submittalId = newSubmittal.id;
    }

    // Duplicate check (Prevent overwriting - mandatory versioning)
    const { data: existing } = await this.admin
      .from("project_document")
      .select("id, version")
      .eq("project_id", params.projectId)
      .eq("project_credit_id", projectCreditId)
      .eq("doc_category", params.docCategory)
      .eq("is_latest", true)
      .maybeSingle();

    if (existing) {
      // If file exists, we mark it as SUPERSEDED in the next step, but block exact name duplicates if needed
      console.log(`[DocumentService] Existing version found (v${existing.version}). Preparing version update.`);
    }

    // Versioning
    const { data: latestVersion } = await this.admin
      .from("project_document")
      .select("id, version")
      .eq("project_id", params.projectId)
      .eq("project_credit_id", projectCreditId)
      .eq("doc_category", params.docCategory)
      .eq("is_latest", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = Number(latestVersion?.version ?? 0) + 1;
    const extension = params.file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const safeDocType = params.docCategory.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    const safeBaseName = params.file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "_").slice(0, 80) || "file";
    const filePath = `${params.projectId}/${projectCreditId}/${safeDocType}/v${nextVersion}-${crypto.randomUUID()}-${safeBaseName}.${extension}`;

    // Upload to Storage
    const { error: storageError } = await this.admin.storage.from("project-documents").upload(filePath, params.file, {
      upsert: false,
      contentType: params.file.type || undefined,
    });

    if (storageError) throw storageError;

    // DB Insert via RPC (Atomic with token consumption)
    const mergedNotes = [
      params.notes,
      params.requirementSlot ? `Requirement slot: ${params.requirementSlot}` : "",
      validation.warnings.length ? `AI precheck warnings: ${validation.warnings.join(" | ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const { data: documentId, error: dbError } = await this.admin.rpc("insert_document_and_consume_tokens", {
      p_project_id: params.projectId,
      p_credit_id: params.creditId,
      p_project_credit_id: projectCreditId,
      p_submittal_id: submittalId,
      p_uploaded_by: user.id,
      p_file_name: params.file.name,
      p_file_path: filePath,
      p_file_type: extension,
      p_doc_category: params.docCategory,
      p_notes: mergedNotes,
      p_status: "DRAFT",
      p_version: nextVersion,
      p_is_latest: true,
      p_parent_document_id: latestVersion?.id ?? null,
      p_client_user_id: clientUserId,
      p_tokens: 1,
      p_reason: "Document upload token burn",
      p_actor_id: user.id,
      p_token_meta: {
        file_name: params.file.name,
        doc_category: params.docCategory,
        credit_id: params.creditId,
        project_credit_id: projectCreditId,
        version: nextVersion,
      },
      p_file_hash: (params as any).fileHash || null,
    });

    if (dbError || !documentId) {
      await this.admin.storage.from("project-documents").remove([filePath]);
      throw dbError ?? new Error("Upload record could not be saved.");
    }

    // Ensure strict latest-version line: only the newly created row remains latest.
    await this.admin
      .from("project_document")
      .update({ is_latest: false })
      .eq("project_id", params.projectId)
      .eq("project_credit_id", projectCreditId)
      .eq("doc_category", params.docCategory)
      .eq("is_latest", true)
      .neq("id", documentId);

    // Post-upload side effects
    await logDocumentActivity(this.admin, {
      documentId,
      projectId: params.projectId,
      action: "uploaded",
      actorId: user.id,
      actorRole,
      summary: `Uploaded ${params.file.name} under ${params.docCategory}.`,
      details: {
        file_name: params.file.name,
        doc_category: params.docCategory,
        credit_id: params.creditId,
        project_credit_id: projectCreditId,
        version: nextVersion,
      },
    });

    const ownerIds = await getProjectMembersByRoles(this.admin, params.projectId, ["owner"]);
    await notifyUsers(this.admin, {
      projectId: params.projectId,
      creditId: params.creditId,
      documentId,
      userIds: ownerIds,
      body: `New upload received for owner review: ${params.file.name}`,
      actionUrl: `/documents?project=${params.projectId}&document=${documentId}`,
    });

    const { data: wallet } = await this.admin
      .from("client_token_wallets")
      .select("token_balance")
      .eq("client_user_id", clientUserId)
      .maybeSingle();
    const balance = Number(wallet?.token_balance ?? 0);
    if (balance <= 25) {
      const escalationUsers = await getProjectMembersByRoles(this.admin, params.projectId, [
        "project_admin",
        "super_admin",
        "super_user",
        "owner",
        "client",
      ]);
      await notifyUsers(this.admin, {
        projectId: params.projectId,
        creditId: params.creditId,
        documentId,
        userIds: escalationUsers,
        body: `Low token warning: client wallet balance is ${balance}. Please load additional tokens to avoid upload interruption.`,
        actionUrl: "/team",
      });
    }

    // Trigger Document Intelligence Analysis (V2 Update)
    void documentIntelligenceService.analyzeDocument(documentId).catch((err) => {
      console.error("Failed to trigger document intelligence", err);
    });
    
    // Emit Event
    await eventBus.emit({
      type: "DOCUMENT_UPLOADED",
      payload: {
        documentId,
        projectId: params.projectId,
        userId: user.id,
      }
    });

    return { id: documentId };
  }

  async updateMetadata(user: CurrentUser, params: {
    documentId: string;
    projectId: string;
    creditId: string;
    docCategory: string;
    notes: string;
  }) {
    const actorRole = await this.getActorProjectRole(params.projectId, user);
    if (!actorRole) throw new Error("Unauthorized.");

    const { data: document } = await this.client
      .from("project_document")
      .select("*")
      .eq("id", params.documentId)
      .maybeSingle();

    if (!document || document.project_id !== params.projectId) {
      throw new Error("Document not found.");
    }

    const workflowState = String(document.workflow_state ?? "DRAFT").toUpperCase();
    if (workflowState === "SUBMITTED" || workflowState === "UNDER_REVIEW" || workflowState === "APPROVED") {
      throw new Error("Document is locked and cannot be modified.");
    }

    const editWindowState = workflowState === "DRAFT" || workflowState === "CLARIFICATION";
    const canAdminEdit = canEditDocumentStatusAtAnyStage(actorRole as any);
    const canOwnEdit = document.uploaded_by === user.id && document.status === "uploaded" && editWindowState && canEditOwnDocumentBeforeFinalApproval(actorRole as any);

    if (!canAdminEdit && !canOwnEdit) {
      throw new Error("Unauthorized: Insufficient permissions to edit metadata.");
    }

    // P1 enforcement parity: L0 metadata remap/update must also respect assignment owner.
    const mappedCredit = await this.getProjectCreditAssignment(params.creditId);
    if (!mappedCredit) {
      throw new Error("Target credit mapping is missing.");
    }
    this.assertL0AssignmentAccess({
      actorRole: String(actorRole),
      actorUserId: user.id,
      mappedCredit,
    });

    const { error } = await this.admin
      .from("project_document")
      .update({
        project_credit_id: params.creditId,
        doc_category: params.docCategory,
        notes: params.notes,
      })
      .eq("id", params.documentId);

    if (error) throw error;

    await logDocumentActivity(this.admin, {
      documentId: params.documentId,
      projectId: params.projectId,
      action: "metadata_updated",
      actorId: user.id,
      actorRole,
      summary: "Updated document mapping details.",
      details: {
        to_credit_id: params.creditId,
        to_doc_category: params.docCategory,
      },
    });

    // Emit Event
    await eventBus.emit({
      type: "DOCUMENT_METADATA_UPDATED",
      payload: {
        documentId: params.documentId,
        projectId: params.projectId,
        userId: user.id,
      }
    });
  }

  async deleteDocument(user: CurrentUser, params: {
    documentId: string;
    projectId: string;
  }) {
    const actorRole = await this.getActorProjectRole(params.projectId, user);
    if (!actorRole) throw new Error("Unauthorized.");

    const { data: document } = await this.client
      .from("project_document")
      .select("*")
      .eq("id", params.documentId)
      .maybeSingle();

    if (!document || document.project_id !== params.projectId) {
      throw new Error("Document not found.");
    }

    const workflowState = String(document.workflow_state ?? "DRAFT").toUpperCase();
    if (workflowState === "APPROVED" && !["super_user", "super_admin"].includes(actorRole)) {
      throw new Error("Approved documents can only be deleted by Super Users.");
    }

    const canAdminDelete = ["super_user", "super_admin", "project_admin"].includes(actorRole);
    const canOwnWithdraw = document.uploaded_by === user.id && document.state === "DRAFT" && canEditOwnDocumentBeforeFinalApproval(actorRole as any);

    if (!canAdminDelete && !canOwnWithdraw) {
      throw new Error("Unauthorized: Insufficient permissions to delete document.");
    }

    if (canOwnWithdraw) {
      const clientUserId = await this.getClientUserForProject(params.projectId);
      if (clientUserId) {
        await this.admin.rpc("credit_client_tokens", {
          p_client_user_id: clientUserId,
          p_project_id: params.projectId,
          p_tokens: 1,
          p_reason: "Token refund for unreviewed document delete",
          p_actor_id: user.id,
          p_meta: { document_id: document.id, file_name: document.file_name },
        });
      }
    }

    await logDocumentActivity(this.admin, {
      documentId: params.documentId,
      projectId: params.projectId,
      action: "deleted",
      actorId: user.id,
      actorRole,
      summary: `Archived document ${document.file_name} (No-Deletion Policy).`,
    });

    // PM RULE: NO DELETION. Instead, we move to a 'REMOVED' or 'REJECTED' state
    const { error } = await this.admin
      .from("project_document")
      .update({ 
        state: "REJECTED", 
        is_latest: false,
        notes: (document.notes ?? "") + `\n[System] Withdrawn by ${user.email} at ${new Date().toISOString()}`
      })
      .eq("id", params.documentId);
    
    if (error) throw error;

    // Emit Event
    await eventBus.emit({
      type: "DOCUMENT_DELETED",
      payload: {
        documentId: params.documentId,
        projectId: params.projectId,
        userId: user.id,
        fileName: document.file_name,
      }
    });
  }

  async resubmitDocument(user: CurrentUser, params: {
    documentId: string;
    projectId: string;
    resubmitNote: string;
  }) {
    const actorRole = await this.getActorProjectRole(params.projectId, user);
    if (!actorRole) throw new Error("Unauthorized.");

    const { data: document } = await this.client
      .from("project_document")
      .select("*")
      .eq("id", params.documentId)
      .maybeSingle();

    if (!document || document.project_id !== params.projectId || document.state !== "CLARIFICATION") {
      throw new Error("Document cannot be resubmitted at this stage.");
    }

    const canAdminEdit = canEditDocumentStatusAtAnyStage(actorRole as any);
    const canOwnEdit = document.uploaded_by === user.id && canEditOwnDocumentBeforeFinalApproval(actorRole as any);

    if (!canAdminEdit && !canOwnEdit) {
      throw new Error("Unauthorized.");
    }

    const transition = await transitionDocumentState(this.admin, {
      documentId: params.documentId,
      newState: "RESUBMITTED",
      userId: user.id,
      actorRole,
      manualSubmit: true,
      updatedEvidence: true,
      remarks: params.resubmitNote,
    });

    if (!transition.ok) throw new Error(transition.error);

    const nextNotes = [document.notes ?? "", params.resubmitNote ? `Resubmission note: ${params.resubmitNote}` : ""].filter(Boolean).join("\n\n");
    await this.admin.from("project_document").update({ notes: nextNotes }).eq("id", params.documentId);
  }
}

export const documentService = new DocumentService();
