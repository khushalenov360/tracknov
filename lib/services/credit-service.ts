import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { logSystemActivity } from "./activity-service";
import { projectService } from "./project-service";
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
  }) {
    const actorRole = await projectService.getActorProjectRole(params.projectId, user);
    const canAssign = ["owner", "project_admin", "super_admin", "super_user"].includes(String(actorRole));
    if (!canAssign) {
      throw new Error("Unauthorized: Only Project Owner/Admin can assign contributors.");
    }

    const { data: member } = params.assignedUserId
      ? await this.admin
          .from("project_users")
          .select("user_id, role")
          .eq("project_id", params.projectId)
          .eq("user_id", params.assignedUserId)
          .maybeSingle()
      : { data: null as any };

    if (params.assignedUserId && !member) {
      throw new Error("Selected contributor is not a member of this project.");
    }

    if (member) {
      const normalizedRole = String(member.role ?? "").toLowerCase();
      const l0Roles = ["consultant", "architect", "mep", "contractor"];
      if (!l0Roles.includes(normalizedRole)) {
        throw new Error("Only contributor roles (Consultant/Architect/MEP/Contractor) can be assigned.");
      }
    }

    const { error } = await this.admin
      .from("project_credits")
      .update({
        assigned_user_id: params.assignedUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.projectCreditId)
      .eq("project_id", params.projectId);

    if (error) throw error;

    await logSystemActivity(this.admin, {
      projectId: params.projectId,
      entityType: "credit",
      entityId: params.projectCreditId,
      action: "credit_assignee_updated",
      actorId: user.id,
      actorRole: actorRole ?? user.role,
      summary: params.assignedUserId ? "Assigned contributor to credit." : "Cleared contributor assignment for credit.",
      details: { assigned_user_id: params.assignedUserId },
    });
  }
}

export const creditService = new CreditService();
