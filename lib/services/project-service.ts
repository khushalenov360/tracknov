import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { canCreateProjects, canDeleteProjects, canManageProject } from "@/lib/rbac";
import { buildSeedCredits } from "@/lib/catalog";
import { igbcRatingSystems } from "@/lib/constants";
import type { CurrentUser, MemberRole } from "@/lib/types";

const GREEN_INTERIORS_SYSTEM = "IGBC Green Interiors";

export class ProjectService {
  private get client() { return createClient(); }
  private get admin() { return env.supabaseServiceRoleKey ? createAdminClient() : this.client; }

  /**
   * Fetches the role of a user within a specific project.
   */
  async getActorProjectRole(projectId: string, user: CurrentUser): Promise<MemberRole | null> {
    if (user.role === "super_user") return "super_user";
    if (user.role === "super_admin") return "super_admin";

    const { data: membership } = await this.client
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    return membership?.role ?? user.role;
  }

  /**
   * Creates a new project, initializes its team, credits, and default billing.
   */
  async createProject(user: CurrentUser, params: {
    name: string;
    ratingSystem: string;
    targetRating?: string;
    clientName?: string;
    location?: string;
    projectType?: string;
    status?: string;
    greenCertification?: string;
    igbcVariant?: string;
  }) {
    if (!canCreateProjects(user.role)) {
      throw new Error("Unauthorized: Insufficient permissions to create projects.");
    }

    const safeRatingSystem = igbcRatingSystems.includes(params.ratingSystem as any)
      ? params.ratingSystem
      : GREEN_INTERIORS_SYSTEM;

    const { data: project, error: projectError } = await this.admin
      .from("projects")
      .insert({
        name: params.name,
        client: params.clientName,
        location: params.location,
        project_type: params.projectType || "commercial",
        status: params.status || "active",
        green_certification: params.greenCertification || "IGBC",
        igbc_variant: params.igbcVariant || "new",
        target_rating: params.targetRating || "Certified",
        certification_type: safeRatingSystem,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (projectError || !project) {
      throw projectError ?? new Error("Failed to create project record.");
    }

    // 1. Initialize membership
    const { error: membershipError } = await this.admin.from("project_members").insert({
      project_id: project.id,
      user_id: user.id,
      role: user.role === "super_user" ? "super_user" : "super_admin",
    });

    if (membershipError) throw membershipError;

    // 2. Seed credits if Green Interiors
    if (safeRatingSystem === GREEN_INTERIORS_SYSTEM) {
      const { data: createdCredits, error: creditsError } = await this.admin
        .from("credits")
        .insert(buildSeedCredits(project.id))
        .select("id, project_id");

      if (creditsError) throw creditsError;

      if ((createdCredits ?? []).length) {
        await this.admin.from("project_credits").insert(
          (createdCredits ?? []).map((credit: any) => ({
            project_id: credit.project_id,
            credit_id: credit.id,
          })),
        );
      }
    }

    // 3. Initialize default billing (Starter Plan)
    const { data: starterPlan } = await this.admin
      .from("subscription_plans")
      .select("code, document_credit_limit, consultant_credit_limit")
      .eq("code", "starter")
      .maybeSingle();

    const defaultPlanCode = starterPlan?.code ?? "starter";
    const defaultDocumentLimit = Number(starterPlan?.document_credit_limit ?? 250);
    const defaultConsultantLimit = Number(starterPlan?.consultant_credit_limit ?? 40);

    await this.admin.from("project_billing_settings").upsert(
      {
        project_id: project.id,
        plan_code: defaultPlanCode,
        document_credit_limit: defaultDocumentLimit,
        consultant_credit_limit: defaultConsultantLimit,
        updated_by: user.id,
      },
      { onConflict: "project_id" },
    );

    return project;
  }

  /**
   * Updates an existing project's metadata.
   */
  async updateProject(user: CurrentUser, projectId: string, params: {
    name: string;
    clientName: string;
    location: string;
    ratingSystem: string;
    status: string;
  }) {
    const role = await this.getActorProjectRole(projectId, user);
    if (!canManageProject(role)) {
      throw new Error("Unauthorized: Insufficient permissions to update project.");
    }

    const { error } = await this.admin
      .from("projects")
      .update({
        name: params.name,
        client: params.clientName,
        location: params.location,
        certification_type: params.ratingSystem,
        status: params.status,
      })
      .eq("id", projectId);

    if (error) throw error;
  }

  /**
   * Deletes a project. Strictly restricted to super_users.
   */
  async deleteProject(user: CurrentUser, projectId: string) {
    if (!canDeleteProjects(user.role)) {
      throw new Error("Unauthorized: Strictly restricted to Super Users.");
    }

    const { error } = await this.admin.from("projects").delete().eq("id", projectId);
    if (error) throw error;
  }
}

export const projectService = new ProjectService();
