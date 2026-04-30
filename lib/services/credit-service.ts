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
    action: "complete" | "blocked";
    blockedBy?: string;
  }) {
    const payload: any = {
      status: params.action,
      blocked_by: params.action === "blocked" ? params.blockedBy : null,
    };

    const { error } = await this.admin
      .from("credits")
      .update(payload)
      .eq("id", params.creditId);

    if (error) throw error;

    await logSystemActivity(this.admin, {
      projectId: params.projectId,
      entityType: "credit",
      entityId: params.creditId,
      action: params.action === "complete" ? "status_complete" : "status_blocked",
      actorId: user.id,
      actorRole: user.role,
      summary: `Marked credit as ${params.action}.`,
      details: params.action === "blocked" ? { blocked_by: params.blockedBy } : {},
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
      .from("credits")
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
      .from("credits")
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
      .from("credits")
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
}

export const creditService = new CreditService();
