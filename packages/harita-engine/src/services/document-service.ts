import { v4 as uuidv4 } from "uuid";
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
import { workflowOrchestratorService } from "./workflow-orchestrator-service";
import { runRuntimeTransition } from "@/core/runtime/orchestrator";
import { eventBus } from "@tracknov/core/events/event-bus";
import type { CurrentUser } from "@/lib/types";
import crypto from "crypto";

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
      .select("id, credit_code, credit_name, assigned_user_id, responsible_role, documents_required, what_to_submit")
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

  private async assertL0AssignmentAccess(args: {
    actorRole: string;
    actorUserId: string;
    mappedCredit: any;
    docCategory?: string;
  }) {
    if (!this.isL0Role(args.actorRole)) return;
    const projectCreditId = String(args.mappedCredit?.id ?? "").trim();
    const docCategory = String(args.docCategory ?? "").trim();
    if (projectCreditId) {
      if (docCategory) {
        const { data: slotAssignments, error: slotError } = await this.admin
          .from("assignments")
          .select("user_id")
          .eq("project_credit_id", projectCreditId)
          .eq("document_type", docCategory)
          .eq("is_active", true);
        if (!slotError && (slotAssignments ?? []).length > 0) {
          if ((slotAssignments ?? []).some((assignment: any) => assignment.user_id === args.actorUserId)) {
            return;
          }
          throw new Error("This document requirement is assigned to a different owner.");
        }
      }
      const { data: assignmentMatch, error: assignmentError } = await this.admin.rpc("is_assigned_user", {
        p_project_credit_id: projectCreditId,
        p_user_id: args.actorUserId,
      });
      if (!assignmentError && assignmentMatch === true) {
        return;
      }
    }
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
    clientChecksum?: string;
    idempotencyKey: string;
  }) {
    const uploadStartTime = Date.now();
    const actorRole = await this.getActorProjectRole(params.projectId, user);
    if (!actorRole || !canUploadProjectDocuments(actorRole as any)) {
      throw new Error("Unauthorized: You do not have upload access for this project.");
    }

    // SECTION 12: Emergency Kill Switch
    const { data: uploadControl } = await this.admin
      .from("system_controls")
      .select("is_enabled")
      .eq("feature_name", "uploads")
      .single();
    
    if (uploadControl && !uploadControl.is_enabled) {
      throw new Error("Document uploads are currently suspended by system administration. Please try again later.");
    }

    let projectCreditId = params.projectCreditId;
    let creditId = params.creditId;

    if (!projectCreditId && creditId) {
      const { data: mappedProjectCredit } = await this.admin
        .from("project_credits")
        .select("id")
        .eq("project_id", params.projectId)
        .eq("credit_id", creditId)
        .maybeSingle();
      projectCreditId = mappedProjectCredit?.id;
    } else if (projectCreditId && !creditId) {
      const { data: mappedProjectCredit } = await this.admin
        .from("project_credits")
        .select("credit_id")
        .eq("id", projectCreditId)
        .maybeSingle();
      creditId = mappedProjectCredit?.credit_id;
      // Mutate params so subsequent calls use the resolved creditId
      params.creditId = creditId as string;
    }

    if (!projectCreditId) {
      throw new Error("Project credit mapping not found.");
    }

    const mappedCredit = await this.getProjectCreditAssignment(projectCreditId);
    if (!mappedCredit) {
      throw new Error("Mapped project credit is missing.");
    }

    // P1 enforcement: L0 uploader must match assignment on this mapped credit.
    await this.assertL0AssignmentAccess({
      actorRole: String(actorRole),
      actorUserId: user.id,
      mappedCredit,
      docCategory: params.docCategory,
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

    const { data: activeSubmittal } = await this.admin
      .from("submittals")
      .select("id")
      .eq("credit_stage_id", creditStageId)
      .in("state", ["ASSIGNED", "IN_PROGRESS", "CLARIFICATION"])
      .order("iteration", { ascending: false })
      .limit(1)
      .maybeSingle();

    let submittalId = activeSubmittal?.id;

    if (!submittalId) {
      const { data: newSubmittal, error: createSubError } = await this.admin
        .from("submittals")
        .insert({
          credit_stage_id: creditStageId,
          project_id: params.projectId,
          credit_id: params.creditId,
          type: params.docCategory,
          state: "ASSIGNED",
          iteration: 1,
          created_by: user.id
        })
        .select("id")
        .single();
      
      if (createSubError) throw createSubError;
      submittalId = newSubmittal.id;
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
    const filePath = `${params.projectId}/${projectCreditId}/${safeDocType}/v${nextVersion}-${uuidv4()}-${safeBaseName}.${extension}`;

    // Calculate Hash for Checksum Verification (Section 7)
    const fileBuffer = Buffer.from(await params.file.arrayBuffer());
    const serverChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    if (params.clientChecksum && params.clientChecksum !== serverChecksum) {
      throw new Error("Checksum mismatch: The uploaded file may be corrupted. Please retry.");
    }

    // Upload to Storage
    const { error: storageError } = await this.admin.storage.from("project-documents").upload(filePath, params.file, {
      upsert: false,
      contentType: params.file.type || undefined,
    });

    if (storageError) throw storageError;

    // Route to correct review level:
    // L0 (architect/contractor/mep/client) → SUBMITTED → L1 (owner/PM) reviews
    // L1 (owner) → UNDER_REVIEW → L3 (project_admin) validates (L2 has no role)
    // L3+ (project_admin/super_admin/super_user) → UNDER_REVIEW → peer L3 validates
    const initialState = this.isL0Role(actorRole) ? "L1_REVIEW" : "UNDER_L3_REVIEW";

    const mergedNotes = [
      params.notes,
      params.requirementSlot ? `Requirement slot: ${params.requirementSlot}` : "",
      validation.warnings.length ? `AI precheck warnings: ${validation.warnings.join(" | ")}` : "",
    ].filter(Boolean).join("\n");

    const { data: documentId, error: dbError } = await this.admin.rpc("insert_document_and_consume_tokens", {
      p_project_id: params.projectId,
      p_credit_id: params.creditId || null,
      p_project_credit_id: projectCreditId,
      p_submittal_id: submittalId,
      p_uploaded_by: user.id,
      p_file_name: params.file.name,
      p_file_path: filePath,
      p_file_type: extension,
      p_doc_category: params.docCategory,
      p_notes: mergedNotes,
      p_status: initialState,
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
        version: nextVersion,
      },
      p_file_hash: serverChecksum,
      p_idempotency_key: params.idempotencyKey,
    });

    if (dbError || !documentId) {
      // SECTION 7: Purge partial binary on metadata failure
      await this.admin.storage.from("project-documents").remove([filePath]);
      throw dbError ?? new Error("Upload record could not be saved.");
    }

    const uploadDurationMs = Date.now() - uploadStartTime;

    await this.admin
      .from("project_document")
      .update({
        file_size_bytes: params.file.size,
        mime_type: params.file.type,
        upload_origin: "web",
        upload_duration_ms: uploadDurationMs,
        compression_applied: false
      })
      .eq("id", documentId);

    try {
      await this.admin
        .from("upload_attempts")
        .insert({
          project_id: params.projectId,
          user_id: user.id,
          file_name: params.file.name,
          file_size_bytes: params.file.size,
          mime_type: params.file.type,
          upload_origin: "web",
          status: "SUCCESS",
          upload_duration_ms: uploadDurationMs,
          compression_applied: false
        });
    } catch (telemetryError) {
      // Silently fail telemetry logging to not interrupt main flow
    }
    
    // Inactivate the assignment now that the requirement is fulfilled (clears the backlog)
    await this.admin
      .from("assignments")
      .update({ is_active: false })
      .eq("project_credit_id", projectCreditId)
      .eq("user_id", user.id)
      .or(`document_type.eq.${params.docCategory},document_type.is.null`);

    // Remediation 02: Activate Submittal Lifecycle (ASSIGNED -> L1_REVIEW)
    if (submittalId) {
      await this.admin
        .from("submittals")
        .update({ state: "L1_REVIEW", updated_at: new Date().toISOString() })
        .eq("id", submittalId)
        .eq("state", "ASSIGNED");
    }

    // telemetry done

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
        version: nextVersion,
        checksum: serverChecksum,
      },
    });

    const ownerIds = await getProjectMembersByRoles(this.admin, params.projectId, ["owner"]);
    await notifyUsers(this.admin, {
      projectId: params.projectId,
      creditId: params.creditId,
      documentId,
      userIds: ownerIds,
      body: `New upload received for Project Manager (PM) review: ${params.file.name}`,
      actionUrl: `/documents?project=${params.projectId}&document=${documentId}`,
    });

    // Trigger Document Intelligence Analysis (V2 Update)
    void documentIntelligenceService.analyzeDocument(documentId).catch((err) => {
      // Silently fail to not interrupt main flow
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

    const workflowState = String(document.workflow_state ?? "ASSIGNED").toUpperCase();
    if (workflowState === "L1_REVIEW" || workflowState === "UNDER_L3_REVIEW" || workflowState === "APPROVED") {
      throw new Error("Document is locked and cannot be modified.");
    }

    const { error } = await this.admin
      .from("project_document")
      .update({
        project_credit_id: params.creditId,
        doc_category: params.docCategory,
        notes: params.notes,
      })
      .eq("id", params.documentId);

    if (error) throw error;

    await runRuntimeTransition(user, {
      entityType: "document",
      entityId: params.documentId,
      projectId: params.projectId,
      targetState: workflowState,
      reason: "Metadata Updated",
      metadata: { project_credit_id: params.creditId, doc_category: params.docCategory, notes: params.notes }
    });

    await logDocumentActivity(this.admin, {
      documentId: params.documentId,
      projectId: params.projectId,
      action: "metadata_updated",
      actorId: user.id,
      actorRole,
      summary: "Updated document mapping details.",
    });

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

    const workflowState = String(document.workflow_state ?? "ASSIGNED").toUpperCase();
    if (workflowState === "APPROVED" && !["super_user", "super_admin"].includes(actorRole)) {
      throw new Error("Approved documents can only be deleted by Super Users.");
    }

    // SECTION 11: No-Deletion Policy (Permanent preservation)
    await logDocumentActivity(this.admin, {
      documentId: params.documentId,
      projectId: params.projectId,
      action: "deleted",
      actorId: user.id,
      actorRole,
      summary: `Archived document ${document.file_name} (No-Deletion Policy).`,
    });

    const result = await runRuntimeTransition(user, {
      entityType: "document",
      entityId: params.documentId,
      projectId: params.projectId,
      targetState: "REJECTED",
      reason: `[System] Withdrawn by ${user.email} at ${new Date().toISOString()}`,
    });

    if (!result.success) throw new Error(result.errors?.join(", ") || "Failed to withdraw document through orchestration.");

    const { error } = await this.admin
      .from("project_document")
      .update({ 
        is_latest: false,
        notes: (document.notes ?? "") + `\n[System] Withdrawn by ${user.email} at ${new Date().toISOString()}`
      })
      .eq("id", params.documentId);
    
    if (error) throw error;

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
    idempotencyKey: string;
  }) {
    const actorRole = await this.getActorProjectRole(params.projectId, user);
    if (!actorRole) throw new Error("Unauthorized.");

    const { data: document } = await this.client
      .from("project_document")
      .select("id, project_id, project_credit_id, doc_category, workflow_state, file_name, notes, state")
      .eq("id", params.documentId)
      .maybeSingle();

    if (!document || document.project_id !== params.projectId || document.state !== "CLARIFICATION") {
      throw new Error("Document cannot be resubmitted at this stage.");
    }

    const result = await workflowOrchestratorService.transition(user, {
      entityType: "document",
      entityId: params.documentId,
      projectId: params.projectId,
      targetState: "UNDER_L3_REVIEW",
      action: "submit",
      reason: params.resubmitNote,
      metadata: {
        manualSubmit: true,
        updatedEvidence: true,
      },
      idempotencyKey: params.idempotencyKey,
    });

    if (!result.ok) throw new Error(result.message);

    const nextNotes = [document.notes ?? "", params.resubmitNote ? `Resubmission note: ${params.resubmitNote}` : ""].filter(Boolean).join("\n\n");
    await this.admin.from("project_document").update({ notes: nextNotes }).eq("id", params.documentId);
  }
}

export const documentService = new DocumentService();
