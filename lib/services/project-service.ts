import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { canCreateProjects, canDeleteProjects, canManageProject } from "@/lib/rbac";
import { buildSeedCredits } from "@/lib/catalog";
import { igbcRatingSystems } from "@/lib/constants";
import { ragService } from "./rag-service";
import type { CurrentUser, MemberRole } from "@/lib/types";

const GREEN_INTERIORS_SYSTEM = "IGBC Green Interiors";

export class ProjectService {
  private get client() { return createClient(); }
  private get admin() { return env.supabaseServiceRoleKey ? createAdminClient() : this.client; }

  /**
   * Generates a unique project code in format TN-{NAME_KEY}-{RANDOM}
   */
  private generateProjectCode(name: string): string {
    const key = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    const rand = Math.floor(Math.random() * 999).toString().padStart(3, "0");
    return `TN-${key}-${rand}`;
  }

  /**
   * Fetches the role of a user within a specific project.
   */
  async getActorProjectRole(projectId: string, user: CurrentUser): Promise<MemberRole | null> {
    if (user.role === "super_user") return "super_user";
    if (user.role === "super_admin") return "super_admin";

    const { data: membership } = await this.client
      .from("project_users")
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
    ratingSystemId?: string;
    ratingSystemName?: string;
    targetRating?: string;
    clientName?: string;
    location?: string;
    projectType?: string;
    state?: string;
    greenCertification?: string;
    igbcVariant?: string;
  }) {
    if (!canCreateProjects(user.role)) {
      throw new Error("Unauthorized: Insufficient permissions to create projects.");
    }

    let ratingSystemId = params.ratingSystemId;
    if (!ratingSystemId && params.ratingSystemName) {
      const { data: rs } = await this.admin
        .from("rating_system")
        .select("id")
        .eq("name", params.ratingSystemName)
        .limit(1)
        .maybeSingle();
      ratingSystemId = rs?.id;
    }

    const projectCode = this.generateProjectCode(params.name);

    const { data: project, error: projectError } = await this.admin
      .from("projects")
      .insert({
        name: params.name,
        client: params.clientName,
        location: params.location,
        project_type: params.projectType || "commercial",
        green_certification: params.greenCertification || "IGBC",
        igbc_variant: params.igbcVariant || "new",
        target_rating: params.targetRating || "Certified",
        certification_type: params.ratingSystemName || GREEN_INTERIORS_SYSTEM,
        rating_system_id: ratingSystemId,
        state: params.state || "ACTIVE",
        project_code: projectCode,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (projectError || !project) {
      throw projectError ?? new Error("Failed to create project record.");
    }

    // 1. Initialize membership
    const { error: membershipError } = await this.admin.from("project_users").insert({
      project_id: project.id,
      user_id: user.id,
      role: user.role === "super_user" ? "super_user" : "super_admin",
    });

    if (membershipError) throw membershipError;

    // 2. Instantiate project credits from templates
    if (ratingSystemId) {
      const { data: templates } = await this.admin
        .from("credit_template")
        .select("*, category:credit_category(name)")
        .eq("rating_system_id", ratingSystemId);

      if (templates && templates.length > 0) {
        // Instantiate into project_credits (the CRITICAL layer)
        const projectCreditsToInsert = templates.map((template: any) => ({
          project_id: project.id,
          credit_template_id: template.id,
          credit_code: template.code,
          credit_name: template.name,
          category_id: template.category_id,
          category_name: template.category?.name,
          max_points: template.max_points || 0,
          state: "DRAFT",
        }));

        await this.admin.from("project_credits").insert(projectCreditsToInsert);

        // Prime RAG guidance context
        await ragService.ingestProjectGuidance(project.id);
      }
    }

    // 3. Initialize default billing
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
   * Joins a project using a human-readable project code.
   */
  async joinProjectByCode(user: CurrentUser, projectCode: string) {
    const { data: project } = await this.admin
      .from("projects")
      .select("id")
      .eq("project_code", projectCode)
      .single();

    if (!project) throw new Error("Invalid project code.");

    const { error } = await this.admin.from("project_users").insert({
      project_id: project.id,
      user_id: user.id,
      role: "consultant", // Default role when joining by code
    });

    if (error && error.code !== "23505") throw error; // Ignore if already a member

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
    state: string;
  }) {
    const role = await this.getActorProjectRole(projectId, user);
    if (!canManageProject(role)) {
      throw new Error("Unauthorized: Insufficient permissions to update project.");
    }

    if (params.state === "APPROVED") {
      const { data: credits } = await this.admin
        .from("project_credits")
        .select("id, state")
        .eq("project_id", projectId);
      const hasOpenCredits = (credits ?? []).some((credit: any) => {
        return credit.state !== "APPROVED" && credit.state !== "CLOSED";
      });
      if (hasOpenCredits) {
        throw new Error("Cannot approve project: open credits still exist.");
      }
    }

    const { error } = await this.admin
      .from("projects")
      .update({
        name: params.name,
        client: params.clientName,
        location: params.location,
        certification_type: params.ratingSystem,
        state: params.state,
      })
      .eq("id", projectId);

    if (error) throw error;
  }

  async deleteProject(user: CurrentUser, projectId: string) {
    if (!canDeleteProjects(user.role)) {
      throw new Error("Unauthorized: Strictly restricted to Super Users.");
    }

    const { error } = await this.admin.from("projects").delete().eq("id", projectId);
    if (error) throw error;
  }
}

export const projectService = new ProjectService();
