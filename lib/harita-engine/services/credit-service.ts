import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { logSystemActivity } from "./activity-service";
import { taskService } from "./task-service";
import { canUser, getRoleLevel } from "@/lib/rbac";
import { interceptMutation } from "@/lib/harita-engine/governance/governanceMutationInterceptor";
import { runRuntimeTransition } from "@/core/runtime/orchestrator";
import type { CurrentUser, MemberRole } from "@/lib/types";

export class CreditService {
  private get client() { return createClient(); }
  private get admin() { return env.supabaseServiceRoleKey ? createAdminClient() : this.client; }

  async setCreditState(user: CurrentUser, params: {
    projectId: string;
    creditId: string;
    state: string;
    remarks?: string;
  }) {
    const actorRole = (user.role as MemberRole);
    
    // Auth Check
    if (!canUser(actorRole, "APPROVE", "CREDIT")) {
      throw new Error("Unauthorized: Insufficient role level for credit state transition.");
    }

    if (params.state === "APPROVED") {
      const { data: docs } = await this.admin
        .from("project_document")
        .select("workflow_state")
        .eq("project_credit_id", params.creditId)
        .eq("is_latest", true);
      
      const rows = docs ?? [];
      const hasUnapproved = rows.some((doc: any) => doc.workflow_state !== "APPROVED");
      if (hasUnapproved) {
        throw new Error("Section 13 Violation: Cannot approve credit until all linked documents are APPROVED.");
      }
    }

    // SECTION 26: Intercept
    await interceptMutation({
      mutationType: "CREDIT_STATE_TRANSITION",
      sourceLayer: "CreditService",
      payload: params
    });

    // Update project_credits via Orchestrator
    const result = await runRuntimeTransition(user, {
      entityType: "credit",
      entityId: params.creditId,
      projectId: params.projectId,
      targetState: params.state,
      reason: params.remarks || "State transition",
      idempotencyKey: `credit-${params.creditId}-${Date.now()}`,
      metadata: { remarks: params.remarks || null }
    });

    if (!result.success) throw new Error(result.errors?.join(", ") || "Failed to update credit state.");
  }

  async updateRequirements(user: CurrentUser, params: {
    projectId: string;
    creditId: string;
    docType: string;
    isRequired: boolean;
  }) {
    // SECTION 26: Intercept
    await interceptMutation({
      mutationType: "CREDIT_REQUIREMENTS_UPDATE",
      sourceLayer: "CreditService",
      payload: params
    });

    const { data: membership } = await this.client
      .from("project_users")
      .select("role")
      .eq("project_id", params.projectId)
      .eq("user_id", user.id)
      .maybeSingle();
    
    const actorRole = (membership?.role as MemberRole) || user.role;
    
    if (!canUser(actorRole, "EDIT_CONTROLS", "PROJECT")) {
      throw new Error("Unauthorized.");
    }

    const { data: credit } = await this.client
      .from("project_credits")
      .select("id, documents_required")
      .eq("id", params.creditId)
      .maybeSingle();

    if (!credit) throw new Error("Credit not found.");

    const nextRequirements = ((credit.documents_required ?? []) as Array<{ type: string; label: string }>).map((item) => {
      if (item.type === params.docType) {
        return {
          ...item,
          required: params.isRequired,
          requirement: params.isRequired ? "Required" : "NA",
        };
      }
      return item;
    });

    const { error } = await this.admin
      .from("project_credits")
      .update({ documents_required: nextRequirements })
      .eq("id", params.creditId);

    if (error) throw error;

    await logSystemActivity(this.admin, {
      projectId: params.projectId,
      entityType: "credit",
      entityId: params.creditId,
      action: "requirements_updated",
      actorId: user.id,
      actorRole,
      summary: "Updated required document type for credit.",
      details: { docType: params.docType, isRequired: params.isRequired },
    });
  }

  async assignContributor(user: CurrentUser, params: {
    projectId: string;
    projectCreditId: string;
    assignedUserId: string | null;
    documentType: string | null;
    reason?: string | null;
  }, externalWriter?: any) {
    const writer = externalWriter || this.admin;
    const documentType = params.documentType || null;
    const now = new Date().toISOString();

    // SECTION 26: Intercept
    await interceptMutation({
      mutationType: "CREDIT_ASSIGNMENT",
      sourceLayer: "CreditService",
      payload: params
    });

    const { data: membership } = await this.client
      .from("project_users")
      .select("role")
      .eq("project_id", params.projectId)
      .eq("user_id", user.id)
      .maybeSingle();
    const actorRole = (membership?.role as MemberRole) || user.role;

    if (!canUser(actorRole, "MANAGE_TEAM", "TEAM")) {
      throw new Error("Unauthorized: Insufficient role level for management.");
    }

    // Stage 1: Parallelize initial updates & member checks
    const initialPromises: Promise<any>[] = [];

    if (params.assignedUserId) {
      initialPromises.push(
        writer
          .from("project_credits")
          .update({
            assigned_user_id: params.assignedUserId,
            updated_at: now,
          })
          .eq("id", params.projectCreditId)
          .eq("project_id", params.projectId)
          .then(({ error }: { error: any }) => { if (error) throw error; })
      );
    }

    let assignmentUpdate = writer
      .from("assignments")
      .update({ is_active: false, updated_at: now })
      .eq("project_id", params.projectId)
      .eq("project_credit_id", params.projectCreditId)
      .eq("is_active", true);
    assignmentUpdate = documentType
      ? assignmentUpdate.eq("document_type", documentType)
      : assignmentUpdate.is("document_type", null);
    
    initialPromises.push(
      assignmentUpdate.then(({ error }: { error: any }) => { if (error) throw error; })
    );

    let targetMemberPromise: Promise<any> = Promise.resolve({ data: null });
    if (params.assignedUserId) {
      targetMemberPromise = Promise.resolve(
        this.client
          .from("project_users")
          .select("role")
          .eq("project_id", params.projectId)
          .eq("user_id", params.assignedUserId)
          .maybeSingle()
      );
    }

    const [, , memberRes] = await Promise.all([
      ...initialPromises,
      targetMemberPromise
    ]);
    const targetMember = (memberRes as any)?.data;

    // Stage 2: Parallelize insertions and state transitions
    if (params.assignedUserId) {
      const postInsertPromises: Promise<any>[] = [];

      postInsertPromises.push(
        writer
          .from("assignments")
          .insert({
            project_id: params.projectId,
            project_credit_id: params.projectCreditId,
            document_type: documentType,
            user_id: params.assignedUserId,
            role: targetMember?.role ?? "L0",
            is_active: true,
            created_by: user.id,
          })
          .then(({ error }: { error: any }) => { if (error) throw error; })
      );

      const docTypeMsg = documentType ? ` for ${documentType}` : "";
      postInsertPromises.push(
        writer.from("notification_outbox").insert({
          project_id: params.projectId,
          user_id: params.assignedUserId,
          event_type: "ASSIGNMENT",
          message: `You have been assigned to provide evidence${docTypeMsg}.`,
          metadata: {
            project_credit_id: params.projectCreditId
          }
        }).then(({ error }: { error: any }) => { if (error) throw error; })
      );

      postInsertPromises.push(
        writer.from("project_credits")
          .update({ state: "IN_PROGRESS" })
          .eq("id", params.projectCreditId)
          .neq("state", "COMPLETE")
          .then(({ error }: { error: any }) => { if (error) throw error; })
      );

      await Promise.all(postInsertPromises);
    }

    // Stage 3: Rekey recalculations, tasks, and system logs in parallel
    const finalPromises: Promise<any>[] = [];

    finalPromises.push(
      writer.rpc("recalculate_derived_states", {
        p_project_id: params.projectId,
        p_project_credit_id: params.projectCreditId,
      }).then(({ error }: { error: any }) => { if (error) throw error; })
    );

    if (params.assignedUserId) {
      finalPromises.push(
        taskService.upsertAssignmentUploadTask({
          projectId: params.projectId,
          projectCreditId: params.projectCreditId,
          assignedUserId: params.assignedUserId,
          createdBy: user.id,
          priority: "HIGH",
          docType: documentType || undefined,
        })
      );
    } else {
      finalPromises.push(
        taskService.closeAssignmentTasks({
          projectId: params.projectId,
          projectCreditId: params.projectCreditId,
        })
      );
    }

    finalPromises.push(
      logSystemActivity(writer, {
        projectId: params.projectId,
        entityType: "credit",
        entityId: params.projectCreditId,
        action: "credit_assignee_updated",
        actorId: user.id,
        actorRole,
        summary: params.assignedUserId ? "Assigned owner to credit document requirement." : "Cleared credit document requirement assignment.",
        details: { assigned_user_id: params.assignedUserId, document_type: documentType },
      })
    );

    await Promise.all(finalPromises);
  }

  async updateGuidance(user: CurrentUser, params: {
    projectId: string;
    creditId: string;
    whatToSubmit?: string;
    sampleDocumentUrl?: string;
    effortLevel?: string | null;
    effortGuidance?: string;
  }) {
    // SECTION 26: Intercept
    await interceptMutation({
      mutationType: "CREDIT_GUIDANCE_UPDATE",
      sourceLayer: "CreditService",
      payload: params
    });

    const actorRole = (user.role as MemberRole);
    if (!canUser(actorRole, "EDIT_CONTROLS", "PROJECT")) {
      throw new Error("Unauthorized.");
    }

    const { error } = await this.admin
      .from("project_credits")
      .update({
        what_to_submit: params.whatToSubmit,
        sample_document_url: params.sampleDocumentUrl,
        effort_level: params.effortLevel,
        effort_guidance: params.effortGuidance,
      })
      .eq("id", params.creditId);

    if (error) throw error;
  }
}

export const creditService = new CreditService();
