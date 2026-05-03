import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { canCreateProjects, canDeleteProjects, canManageProject, canManageProjectGuidebook } from "@/lib/rbac";
import { buildProjectCreditSeedRows, buildSeedCredits } from "@/lib/catalog";
import { igbcRatingSystems } from "@/lib/constants";
import { ragService } from "./rag-service";
import type { CurrentUser, MemberRole } from "@/lib/types";
import * as XLSX from "xlsx";

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
        .from("rating_systems")
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
        status: params.state || "ACTIVE",
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

    // 2. Instantiate project credits from templates (preferred path)
    let instantiatedCredits = 0;
    if (ratingSystemId) {
      const { data: templates } = await this.admin
        .from("credit_templates")
        .select("*, category:credit_categories(name)")
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
          status: "DRAFT", // Use status as state rename 0043 is not applied remotely
        }));

        const { error: insertTemplateCreditsError } = await this.admin.from("project_credits").insert(projectCreditsToInsert);
        if (insertTemplateCreditsError) {
          throw insertTemplateCreditsError;
        }
        instantiatedCredits = projectCreditsToInsert.length;

        // Prime RAG guidance context
        await ragService.ingestProjectGuidance(project.id);
      }
    }

    // 2b. Fallback seeding to prevent empty workspace trackers.
    // If templates are unavailable/missing, seed from the static IGBC catalog.
    if (instantiatedCredits === 0) {
      const fallbackCredits = buildProjectCreditSeedRows(project.id);
      if (fallbackCredits.length > 0) {
        const { error: fallbackSeedError } = await this.admin
          .from("project_credits")
          .insert(fallbackCredits);
        if (fallbackSeedError) {
          throw fallbackSeedError;
        }
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
    // Sanitize: Trim, Upper, and handle common delimiters (spaces/hyphens)
    const cleanedCode = projectCode.trim().toUpperCase().replace(/\s+/g, '-');
    console.log(`[ProjectService] User ${user.email} attempting to join project with code: ${cleanedCode}`);
    
    const { data: project, error: fetchError } = await this.admin
      .from("projects")
      .select("id, name")
      .eq("project_code", cleanedCode)
      .maybeSingle();

    if (fetchError) {
      console.error("[ProjectService] Database error while fetching project code:", fetchError);
      throw new Error(`Database error: ${fetchError.message}`);
    }

    if (!project) {
      console.warn(`[ProjectService] Project code not found: ${cleanedCode}`);
      throw new Error("Invalid project code.");
    }

    console.log(`[ProjectService] Project found: ${project.name} (${project.id}). Linking user...`);

    // Ensure profile exists before linking
    const { data: profile } = await this.admin
      .from("profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      console.log(`[ProjectService] Creating missing profile for user ${user.id} during join.`);
      await this.admin.from("profiles").insert({
        user_id: user.id,
        email: user.email,
        full_name: "Project member",
      });
    }

    const { error: insertError } = await this.admin.from("project_users").insert({
      project_id: project.id,
      user_id: user.id,
      role: "consultant", 
    });

    if (insertError) {
      if (insertError.code === "23505") {
        console.log("[ProjectService] User is already a member of this project.");
        return project;
      }
      console.error("[ProjectService] Error linking user to project:", insertError);
      throw new Error(`Failed to link user: ${insertError.message}`);
    }

    console.log(`[ProjectService] Successfully joined user ${user.email} to project ${project.name}`);
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
        .select("id, status")
        .eq("project_id", projectId);
      const hasOpenCredits = (credits ?? []).some((credit: any) => {
        return credit.status !== "APPROVED" && credit.status !== "CLOSED";
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
        status: params.state,
      })
      .eq("id", projectId);

    if (error) throw error;
  }

  async uploadProjectGuidebook(user: CurrentUser, params: {
    projectId: string;
    file: File;
    title?: string;
  }) {
    const role = await this.getActorProjectRole(params.projectId, user);
    if (!canManageProjectGuidebook(role)) {
      throw new Error("Only Project Admin or Super User can upload the project guidebook.");
    }

    const lowerName = params.file.name.toLowerCase();
    if (!lowerName.endsWith(".pdf")) {
      throw new Error("Guidebook must be a PDF file.");
    }
    if (params.file.size > 50 * 1024 * 1024) {
      throw new Error("Guidebook file is too large. Max supported size is 50 MB.");
    }

    const safeTitle = (params.title ?? params.file.name.replace(/\.[^.]+$/, "")).trim().slice(0, 200) || "IGBC Guidebook";
    const sanitizedBase = params.file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "_").slice(0, 80) || "guidebook";
    const filePath = `${params.projectId}/guidebooks/${Date.now()}-${crypto.randomUUID()}-${sanitizedBase}.pdf`;

    const { error: uploadError } = await this.admin.storage
      .from("project-documents")
      .upload(filePath, params.file, { upsert: false, contentType: "application/pdf" });
    if (uploadError) throw uploadError;

    const { error: insertError } = await this.admin.from("project_guidebooks").insert({
      project_id: params.projectId,
      title: safeTitle,
      file_name: params.file.name,
      file_path: filePath,
      uploaded_by: user.id,
    });

    if (insertError) {
      await this.admin.storage.from("project-documents").remove([filePath]);
      throw insertError;
    }
  }

  async deleteProject(user: CurrentUser, projectId: string) {
    if (!canDeleteProjects(user.role)) {
      throw new Error("Unauthorized: Strictly restricted to Super Users.");
    }

    const { error } = await this.admin.from("projects").delete().eq("id", projectId);
    if (error) throw error;
  }

  async importTrackerBaseline(user: CurrentUser, params: {
    projectId: string;
    file: File;
  }) {
    const role = await this.getActorProjectRole(params.projectId, user);
    if (!canManageProjectGuidebook(role)) {
      throw new Error("Only Project Admin or Super User can import tracker baseline.");
    }

    const fileName = params.file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      throw new Error("Tracker import supports only .xlsx/.xls files.");
    }

    const arrayBuffer = await params.file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames.find((name) => name.toLowerCase().includes("document tracker")) ?? workbook.SheetNames[0];
    if (!sheetName) throw new Error("No worksheet found in tracker file.");
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Array<any>>(sheet, { header: 1, defval: "" });
    if (!rows.length || rows.length < 3) throw new Error("Tracker sheet is empty.");

    const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const parseRole = (value: string) => {
      const v = value.toLowerCase();
      if (v.includes("mep")) return "mep";
      if (v.includes("architect")) return "architect";
      if (v.includes("contractor")) return "contractor";
      if (v.includes("owner") || v.includes("project owner")) return "owner";
      if (v.includes("client")) return "client";
      if (v.includes("project admin") || v.includes("enov")) return "project_admin";
      return null;
    };

    const statusIsRequired = (value: string) => {
      const normalized = value.trim().toLowerCase();
      if (!normalized || normalized === "na") return false;
      return true;
    };

    const docColumns = [
      { idx: 3, type: "Narrative", label: "Narrative" },
      { idx: 4, type: "Tech Spec", label: "Tech Specs" },
      { idx: 5, type: "Certificate/Declaration", label: "Certificates/ Declaration" },
      { idx: 6, type: "Drawing", label: "Drawings" },
      { idx: 7, type: "Calculation & Tables", label: "Calculations & Tables" },
      { idx: 8, type: "Invoice", label: "Invoices" },
      { idx: 9, type: "Pic/Video", label: "Pic/Video" },
    ] as const;

    const { data: projectCredits, error: projectCreditsError } = await this.admin
      .from("project_credits")
      .select("id, credit_code, credit_name")
      .eq("project_id", params.projectId);
    if (projectCreditsError) throw projectCreditsError;

    const { data: legacyCredits } = await this.admin
      .from("credits")
      .select("id, credit_code, credit_name")
      .eq("project_id", params.projectId);

    const byCode = new Map<string, { id: string; table: "project_credits" | "credits" }>();
    for (const credit of projectCredits ?? []) {
      byCode.set(normalize(String((credit as any).credit_code ?? "")), { id: (credit as any).id, table: "project_credits" });
    }
    for (const credit of legacyCredits ?? []) {
      const key = normalize(String((credit as any).credit_code ?? ""));
      if (!byCode.has(key)) byCode.set(key, { id: (credit as any).id, table: "credits" });
    }

    let updated = 0;
    for (let r = 2; r < rows.length; r += 1) {
      const row = rows[r] ?? [];
      const criteriaCode = String(row[0] ?? "").trim();
      const creditName = String(row[1] ?? "").trim();
      const docsRequiredText = String(row[2] ?? "").trim();
      if (!criteriaCode || !creditName) continue;
      if (!/credit|mandatory/i.test(criteriaCode)) continue;

      const codeKey = normalize(criteriaCode.replace(/\s+/g, " "));
      const hit = byCode.get(codeKey);
      if (!hit) continue;

      const documentsRequired = docColumns.map((col) => {
        const raw = String(row[col.idx] ?? "");
        return {
          type: col.type,
          label: col.label,
          requirement: statusIsRequired(raw) ? "Required" : "NA",
          required: statusIsRequired(raw),
        };
      });
      const responsibleRole = parseRole(String(row[13] ?? "").trim());
      const patch = {
        documents_required: documentsRequired,
        what_to_submit: docsRequiredText || null,
        responsible_role: responsibleRole,
      } as Record<string, any>;

      if (hit.table === "project_credits") {
        const { error } = await this.admin.from("project_credits").update(patch).eq("id", hit.id);
        if (error) {
          const { error: fallbackError } = await this.admin.from("credits").update(patch).eq("project_id", params.projectId).ilike("credit_code", criteriaCode);
          if (fallbackError) continue;
        }
      } else {
        const { error } = await this.admin.from("credits").update(patch).eq("id", hit.id);
        if (error) continue;
      }

      updated += 1;
    }

    await ragService.ingestProjectGuidance(params.projectId);
    return { updated };
  }
}

export const projectService = new ProjectService();
