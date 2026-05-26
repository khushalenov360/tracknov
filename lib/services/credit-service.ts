import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { logSystemActivity } from "./activity-service";
import { taskService } from "./task-service";
import { canUser, getRoleLevel } from "@/lib/rbac";
import { interceptMutation } from "@/lib/governance/governanceMutationInterceptor";
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
    selectedTypes: string[];
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

    const selectedTypesSet = new Set(params.selectedTypes);
    const nextRequirements = ((credit.documents_required ?? []) as Array<{ type: string; label: string }>).map((item) => {
      const required = selectedTypesSet.has(item.type);
      return {
        ...item,
        required,
        requirement: required ? "Required" : "NA",
      };
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
      summary: "Updated required document types for credit.",
      details: { required_types: params.selectedTypes },
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

    if (params.assignedUserId) {
      const { error } = await writer
        .from("project_credits")
        .update({
          assigned_user_id: params.assignedUserId,
          updated_at: now,
        })
        .eq("id", params.projectCreditId)
        .eq("project_id", params.projectId);

      if (error) throw error;
    }

    // Clear old active assignments
    let assignmentUpdate = writer
      .from("assignments")
      .update({ is_active: false, updated_at: now })
      .eq("project_id", params.projectId)
      .eq("project_credit_id", params.projectCreditId)
      .eq("is_active", true);
    assignmentUpdate = documentType
      ? assignmentUpdate.eq("document_type", documentType)
      : assignmentUpdate.is("document_type", null);
    await assignmentUpdate;

    if (params.assignedUserId) {
      const { data: targetMember } = await this.client
        .from("project_users")
        .select("role")
        .eq("project_id", params.projectId)
        .eq("user_id", params.assignedUserId)
        .maybeSingle();

      const { error: assignmentError } = await writer
        .from("assignments")
        .insert({
          project_id: params.projectId,
          project_credit_id: params.projectCreditId,
          document_type: documentType,
          user_id: params.assignedUserId,
          role: targetMember?.role ?? "L0",
          is_active: true,
          created_by: user.id,
        });
      if (assignmentError) throw assignmentError;

      // Remediation 06: Assignment Creates Momentum
      // 1. Notify the assignee
      const docTypeMsg = documentType ? ` for ${documentType}` : "";
      await writer.from("notification_outbox").insert({
        project_id: params.projectId,
        user_id: params.assignedUserId,
        event_type: "ASSIGNMENT",
        message: `You have been assigned to provide evidence${docTypeMsg}.`,
        metadata: {
          project_credit_id: params.projectCreditId
        }
      });

      // 2. Update credit state to IN_PROGRESS (if not COMPLETE)
      await writer.from("project_credits")
        .update({ state: "IN_PROGRESS" })
        .eq("id", params.projectCreditId)
        .neq("state", "COMPLETE");
    }

    // Trigger explicit recalculation to update progress engine (10% assignment weight)
    await writer.rpc("recalculate_derived_states", {
      p_project_id: params.projectId,
      p_project_credit_id: params.projectCreditId,
    });

    if (params.assignedUserId) {
      await taskService.upsertAssignmentUploadTask({
        projectId: params.projectId,
        projectCreditId: params.projectCreditId,
        assignedUserId: params.assignedUserId,
        createdBy: user.id,
        priority: "HIGH",
        docType: documentType || undefined,
      });
    } else {
      await taskService.closeAssignmentTasks({
        projectId: params.projectId,
        projectCreditId: params.projectCreditId,
      });
    }

    await logSystemActivity(writer, {
      projectId: params.projectId,
      entityType: "credit",
      entityId: params.projectCreditId,
      action: "credit_assignee_updated",
      actorId: user.id,
      actorRole,
      summary: params.assignedUserId ? "Assigned owner to credit document requirement." : "Cleared credit document requirement assignment.",
      details: { assigned_user_id: params.assignedUserId, document_type: documentType },
    });
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
