import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { logSystemActivity } from "./activity-service";
import { projectService } from "./project-service";
import { taskService } from "./task-service";
import type { CurrentUser } from "@/lib/types";

export class CreditService {
  private get client() { return createClient(); }
  private get admin() { return env.supabaseServiceRoleKey ? createAdminClient() : this.client; }

  async setCreditState(user: CurrentUser, params: {
    projectId: string;
    creditId: string;
    state: "DRAFT" | "ASSIGNED" | "IN_PROGRESS" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CLOSED";
    remarks?: string;
  }) {
    // params.creditId here is project_credit.id from action payload.
    if (params.state === "APPROVED") {
      const { data: docs } = await this.admin
        .from("project_document")
        .select("id, state")
        .eq("project_credit_id", params.creditId)
        .eq("is_latest", true);
      const rows = docs ?? [];
      const hasUnapproved = rows.some((document: any) => String(document.state ?? "").toUpperCase() !== "APPROVED");
      if (hasUnapproved) {
        throw new Error("Cannot approve credit until all linked documents are approved.");
      }
    }

    // Update project_credits (the critical layer)

    const { error: pcError } = await this.admin
      .from("project_credits")
      .update({ 
        state: params.state,
        updated_at: new Date().toISOString()
      })
      .eq("id", params.creditId);

    if (pcError) throw pcError;

    await logSystemActivity(this.admin, {
      projectId: params.projectId,
      entityType: "credit",
      entityId: params.creditId,
      action: `state_${params.state.toLowerCase()}`,
      actorId: user.id,
      actorRole: user.role,
      summary: `Transitioned credit to ${params.state}.`,
      details: params.remarks ? { remarks: params.remarks } : {},
    });
  }

  async updateRequirements(user: CurrentUser, params: {
    projectId: string;
    creditId: string;
    selectedTypes: string[];
  }) {
    const actorRole = await projectService.getActorProjectRole(params.projectId, user);
    if (!(actorRole === "project_admin" || actorRole === "super_user")) {
      throw new Error("Unauthorized.");
    }

    const { data: credit } = await this.client
      .from("project_credits")
      .select("documents_required")
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

  async updateGuidance(user: CurrentUser, params: {
    projectId: string;
    creditId: string;
    whatToSubmit: string;
    effortLevel: string;
    effortGuidance: string;
  }) {
    const actorRole = await projectService.getActorProjectRole(params.projectId, user);
    if (!(actorRole === "project_admin" || actorRole === "super_user")) {
      throw new Error("Unauthorized.");
    }

    const safeEffortLevel = ["easy", "moderate", "hard"].includes(params.effortLevel) ? params.effortLevel : "moderate";

    const { error } = await this.admin
      .from("project_credits")
      .update({
        what_to_submit: params.whatToSubmit,
        effort_level: safeEffortLevel,
        effort_guidance: params.effortGuidance,
      })
      .eq("id", params.creditId);

    if (error) throw error;

    await logSystemActivity(this.admin, {
      projectId: params.projectId,
      entityType: "credit",
      entityId: params.creditId,
      action: "guidance_updated",
      actorId: user.id,
      actorRole,
      summary: "Updated client guidance and effort profile.",
      details: { effort_level: safeEffortLevel },
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

    const { data: member } = await this.client
      .from("project_users")
      .select("role")
      .eq("project_id", params.projectId)
      .eq("user_id", params.assignedUserId)
      .maybeSingle();

    const { data: actorMembership } = await this.client
      .from("project_users")
      .select("role")
      .eq("project_id", params.projectId)
      .eq("user_id", user.id)
      .maybeSingle();
    const actorRole = actorMembership?.role;

    // Use the provided writer (which should have context set) for all mutations
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

    // Keep DB-level assignment ledger in sync (single active assignee policy).
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
      const { error: assignmentError } = await writer
        .from("assignments")
        .insert({
          project_id: params.projectId,
          project_credit_id: params.projectCreditId,
          document_type: documentType,
          user_id: params.assignedUserId,
          role: member?.role ?? "consultant",
          is_active: true,
          created_by: user.id,
        });
      if (assignmentError) throw assignmentError;
    }

    const { data: creditMeta } = await writer
      .from("project_credits")
      .select("credit_code, credit_name")
      .eq("id", params.projectCreditId)
      .maybeSingle();

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
      actorRole: actorRole ?? user.role,
      summary: params.assignedUserId ? "Assigned owner to credit document requirement." : "Cleared credit document requirement assignment.",
      details: { assigned_user_id: params.assignedUserId, document_type: documentType },
    });

  }
}

export const creditService = new CreditService();
