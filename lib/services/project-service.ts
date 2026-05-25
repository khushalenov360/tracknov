import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { canCreateProjects, canDeleteProjects, canManageProject, canManageProjectGuidebook } from "@/lib/rbac";
import { buildProjectCreditSeedRows, buildSeedCredits } from "@/lib/catalog";
import { igbcRatingSystems } from "@/lib/constants";
import { ragService } from "./rag-service";
import type { CurrentUser, MemberRole } from "@/lib/types";
import ExcelJS from "exceljs";
import { createHash, randomUUID } from "node:crypto";

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

  private async instantiateLegacyCreditBridge(projectId: string): Promise<number> {
    const seedCredits = buildSeedCredits(projectId);
    if (!seedCredits.length) return 0;

    // Seed legacy credits table first.
    const { error: creditInsertError } = await this.admin.from("credits").insert(seedCredits);
    if (creditInsertError && creditInsertError.code !== "23505") {
      throw creditInsertError;
    }

    const { data: legacyCredits, error: legacyCreditsError } = await this.admin
      .from("credits")
      .select("id, credit_code, credit_name, is_mandatory, documents_required, documentation_summary")
      .eq("project_id", projectId);
    if (legacyCreditsError) throw legacyCreditsError;
    if (!legacyCredits?.length) return 0;

    const bridgeRows = legacyCredits.map((credit: any) => ({
      project_id: projectId,
      credit_id: credit.id,
      credit_code: credit.credit_code,
      credit_name: credit.credit_name,
      is_mandatory: Boolean(credit.is_mandatory),
      documents_required: credit.documents_required ?? [],
      documentation_summary: credit.documentation_summary ?? null,
      status: "DRAFT",
    }));

    const { error: bridgeError } = await this.admin.from("project_credits").insert(bridgeRows);
    if (bridgeError && bridgeError.code !== "23505") {
      throw bridgeError;
    }

    return bridgeRows.length;
  }

  private async instantiateProjectCreditsIfMissing(projectId: string, ratingSystemId?: string | null): Promise<number> {
    const { count } = await this.admin
      .from("project_credits")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);

    if (Number(count ?? 0) > 0) {
      return Number(count ?? 0);
    }

    let seeded = 0;

    if (ratingSystemId) {
      const { data: templates } = await this.admin
        .from("credit_templates")
        .select("*, category:credit_categories(name)")
        .eq("rating_system_id", ratingSystemId);

      if (templates && templates.length > 0) {
        const projectCreditsToInsert = templates.map((template: any) => ({
          project_id: projectId,
          credit_template_id: template.id,
          credit_code: template.code,
          credit_name: template.name,
          category_id: template.category_id,
          category_name: template.category?.name,
          max_points: template.max_points || 0,
          status: "DRAFT",
        }));

        const { error: insertTemplateCreditsError } = await this.admin
          .from("project_credits")
          .insert(projectCreditsToInsert);
        if (insertTemplateCreditsError) {
          throw insertTemplateCreditsError;
        }

        seeded = projectCreditsToInsert.length;
      }
    }

    if (seeded === 0) {
      const fallbackCredits = buildProjectCreditSeedRows(projectId);
      if (fallbackCredits.length > 0) {
        const { error: fallbackSeedError } = await this.admin.from("project_credits").insert(fallbackCredits);
        if (fallbackSeedError) {
          const message = String(fallbackSeedError.message ?? "").toLowerCase();
          const code = String(fallbackSeedError.code ?? "");
          const needsLegacyBridge =
            code === "23502" ||
            message.includes("credit_id") ||
            message.includes("null value") ||
            message.includes("violates not-null constraint");
          if (!needsLegacyBridge) {
            throw fallbackSeedError;
          }
          seeded = await this.instantiateLegacyCreditBridge(projectId);
        } else {
          seeded = fallbackCredits.length;
        }
      }
    }

    if (seeded > 0) {
      await ragService.ingestProjectGuidance(projectId);
    }

    return seeded;
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

    // 2. Instantiate project credits (template-first, fallback to static seed)
    await this.instantiateProjectCreditsIfMissing(project.id, ratingSystemId ?? null);

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

    

    // Ensure profile exists before linking
    const { data: profile } = await this.admin
      .from("profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      
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
        
        return project;
      }
      console.error("[ProjectService] Error linking user to project:", insertError);
      throw new Error(`Failed to link user: ${insertError.message}`);
    }

    
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

    if (role !== "super_user") {
      // Guidebook execution freeze check
      const [ { count: docCount }, { count: assignmentCount } ] = await Promise.all([
        this.admin.from("project_document").select("*", { count: "exact", head: true }).eq("project_id", params.projectId),
        this.admin.from("assignments").select("*", { count: "exact", head: true }).eq("project_id", params.projectId).eq("is_active", true)
      ]);
      
      if ((docCount ?? 0) > 0 || (assignmentCount ?? 0) > 0) {
        throw new Error("Guidebook is immutable because project execution has already begun. Only a Super User can override this lock.");
      }
    }

    const safeTitle = (params.title ?? params.file.name.replace(/\.[^.]+$/, "")).trim().slice(0, 200) || "IGBC Guidebook";
    const sanitizedBase = params.file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "_").slice(0, 80) || "guidebook";
    const filePath = `${params.projectId}/guidebooks/${Date.now()}-${randomUUID()}-${sanitizedBase}.pdf`;

    const { data: existingGuidebook } = await this.admin
      .from("project_guidebooks")
      .select("id, file_path")
      .eq("project_id", params.projectId)
      .eq("file_name", params.file.name)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error: uploadError } = await this.admin.storage
      .from("project-documents")
      .upload(filePath, params.file, { upsert: false, contentType: "application/pdf" });
    if (uploadError) throw uploadError;

    const writePayload = {
      project_id: params.projectId,
      title: safeTitle,
      file_name: params.file.name,
      file_path: filePath,
      uploaded_by: user.id,
    };

    let writeError: any = null;
    if (existingGuidebook?.id) {
      const { error } = await this.admin
        .from("project_guidebooks")
        .update(writePayload)
        .eq("id", existingGuidebook.id);
      writeError = error;
      if (!error && existingGuidebook.file_path && existingGuidebook.file_path !== filePath) {
        await this.admin.storage.from("project-documents").remove([existingGuidebook.file_path]);
      }
    } else {
      const { error } = await this.admin.from("project_guidebooks").insert(writePayload);
      writeError = error;
    }

    if (writeError) {
      await this.admin.storage.from("project-documents").remove([filePath]);
      throw writeError;
    }

    // Self-heal: uploading the project guidebook must always lead to an instantiated workspace.
    const { data: projectMeta } = await this.admin
      .from("projects")
      .select("rating_system_id")
      .eq("id", params.projectId)
      .maybeSingle();
    await this.instantiateProjectCreditsIfMissing(params.projectId, (projectMeta as any)?.rating_system_id ?? null);
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

    // Self-heal before import: ensure project credit rows exist.
    const { data: projectMeta } = await this.admin
      .from("projects")
      .select("rating_system_id")
      .eq("id", params.projectId)
      .maybeSingle();
    await this.instantiateProjectCreditsIfMissing(params.projectId, (projectMeta as any)?.rating_system_id ?? null);

    const arrayBuffer = await params.file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    const trackerSheet = workbook.worksheets.find(ws => ws.name.toLowerCase().includes("document tracker")) || workbook.worksheets[0];
    if (!trackerSheet) throw new Error("No worksheet found in tracker file.");

    const rows: any[][] = [];
    trackerSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const rowData: any[] = [];
      // ExcelJS row.values is 1-indexed, first element is null/undefined
      for (let i = 1; i <= trackerSheet.columnCount; i++) {
        rowData.push(row.getCell(i).value ?? "");
      }
      rows.push(rowData);
    });

    if (rows.length < 2) throw new Error("Tracker sheet is empty.");

    const normalize = (value: string) => value.toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const extractStructuredCode = (value: string) => {
      const upper = value.toString().toUpperCase();
      const match = upper.match(/([A-Z]{2,4})\s*(?:CREDIT|C|MR|MREQ|MANDATORY\s+REQUIREMENT)?\s*([0-9]{1,2}(?:\.[0-9]{1,2})?)/);
      if (!match) return null;
      const [, prefix, num] = match;
      return `${prefix} C${num}`;
    };
    const codeVariants = (value: string) => {
      const original = value.toString().trim();
      const upper = original.toUpperCase();
      const variants = new Set<string>();
      const push = (v: string) => {
        const n = normalize(v);
        if (n) variants.add(n);
      };

      push(original);
      push(upper);
      push(upper.replace(/CREDIT/g, "C"));
      push(upper.replace(/MANDATORY REQUIREMENT/g, "MR"));
      push(upper.replace(/MANDATORY/g, "M").replace(/REQUIREMENT/g, "R"));
      push(upper.replace(/[\-_]/g, " "));
      push(upper.replace(/\./g, ""));

      const tokenized = upper.match(/^([A-Z]{2,4})\s*(?:CREDIT|C|MR|MREQ|MANDATORY\s+REQUIREMENT)?\s*([0-9]{1,2})/);
      if (tokenized) {
        const [, prefix, num] = tokenized;
        push(`${prefix} C${num}`);
        push(`${prefix} CREDIT ${num}`);
        push(`${prefix} ${num}`);
      }

      const structured = extractStructuredCode(upper);
      if (structured) {
        push(structured);
        push(structured.replace(/\s+/g, ""));
      }

      return Array.from(variants);
    };
    const parseRole = (value: string) => {
      const v = value.toString().toLowerCase();
      if (v.includes("mep")) return "mep";
      if (v.includes("architect")) return "architect";
      if (v.includes("contractor")) return "contractor";
      if (v.includes("owner") || v.includes("project owner") || v.includes("pm") || v.includes("project manager")) return "owner";
      if (v.includes("client")) return "client";
      if (v.includes("project admin") || v.includes("enov")) return "project_admin";
      return null;
    };

    const statusIsRequired = (value: string) => {
      const normalized = value.toString().trim().toLowerCase();
      if (!normalized || normalized === "na") return false;
      return true;
    };

    const normalizeHeader = (value: string) => value.toString().toLowerCase().replace(/[^a-z0-9]/g, "");
    const headerRowIndex = rows.findIndex((row) => {
      const cells = (row ?? []).map((cell: any) => normalizeHeader(String(cell ?? "")));
      return cells.some((cell) => cell.includes("criteria")) && cells.some((cell) => cell.includes("creditname"));
    });
    const resolvedHeaderIndex = headerRowIndex >= 0 ? headerRowIndex : 1;
    const headerRow = rows[resolvedHeaderIndex] ?? [];
    const findColumn = (aliases: string[], fallback: number) => {
      for (let i = 0; i < headerRow.length; i += 1) {
        const headerCell = normalizeHeader(String(headerRow[i] ?? ""));
        if (!headerCell) continue;
        if (aliases.some((alias) => headerCell.includes(alias))) return i;
      }
      return fallback;
    };

    const criteriaCol = findColumn(["criteria", "creditcode", "credit"], 0);
    const creditNameCol = findColumn(["creditname", "credittitle", "name"], 1);
    const docsSummaryCol = findColumn(["whattosubmit", "documentation", "requirements"], 2);
    const responsibleRoleCol = findColumn(["owner", "responsiblerole", "role"], 13);

    const docColumns = [
      { idx: findColumn(["narrative"], 3), type: "Narrative", label: "Narrative" },
      { idx: findColumn(["techspec", "technicalspec", "specification"], 4), type: "Tech Spec", label: "Tech Specs" },
      { idx: findColumn(["certificate", "declaration"], 5), type: "Certificate/Declaration", label: "Certificates/ Declaration" },
      { idx: findColumn(["drawing", "dwg"], 6), type: "Drawing", label: "Drawings" },
      { idx: findColumn(["calculation", "table"], 7), type: "Calculation & Tables", label: "Calculations & Tables" },
      { idx: findColumn(["invoice"], 8), type: "Invoice", label: "Invoices" },
      { idx: findColumn(["picvideo", "photo", "image", "video"], 9), type: "Pic/Video", label: "Pic/Video" },
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
    const byName = new Map<string, { id: string; table: "project_credits" | "credits" }>();
    const availableProjectCodes = new Set<string>();
    for (const credit of projectCredits ?? []) {
      const code = String((credit as any).credit_code ?? "");
      if (code) availableProjectCodes.add(code.trim());
      const name = normalize(String((credit as any).credit_name ?? ""));
      for (const key of codeVariants(code)) {
        byCode.set(key, { id: (credit as any).id, table: "project_credits" });
      }
      if (name) byName.set(name, { id: (credit as any).id, table: "project_credits" });
    }
    for (const credit of legacyCredits ?? []) {
      const code = String((credit as any).credit_code ?? "");
      for (const key of codeVariants(code)) {
        if (!byCode.has(key)) byCode.set(key, { id: (credit as any).id, table: "credits" });
      }
      const nameKey = normalize(String((credit as any).credit_name ?? ""));
      if (nameKey && !byName.has(nameKey)) byName.set(nameKey, { id: (credit as any).id, table: "credits" });
    }

    let updated = 0;
    const unmatchedRows: Array<{ code: string; name: string }> = [];
    for (let r = resolvedHeaderIndex + 1; r < rows.length; r += 1) {
      const row = rows[r] ?? [];
      const criteriaCode = String(row[criteriaCol] ?? "").trim();
      const creditName = String(row[creditNameCol] ?? "").trim();
      const docsRequiredText = String(row[docsSummaryCol] ?? "").trim();
      if (!criteriaCode || !creditName) continue;

      const rawCode = criteriaCode.replace(/\s+/g, " ").trim();
      const codeKeys = codeVariants(rawCode);
      const codeKey = codeKeys[0] ?? "";
      const creditNameKey = normalize(creditName);
      let hit = codeKeys.map((key) => byCode.get(key)).find(Boolean);
      if (!hit) {
        const shortFromText = normalize(rawCode.split(/\s+/).slice(0, 2).join(" "));
        hit = byCode.get(shortFromText);
      }
      if (!hit) {
        const condensed = normalize(rawCode.replace(/[-_/]/g, " "));
        hit = byCode.get(condensed);
      }
      if (!hit) {
        const codeWithoutSuffix = normalize(rawCode.replace(/[^A-Za-z0-9 ]+/g, " ").split(/\s+/).slice(0, 3).join(" "));
        hit = byCode.get(codeWithoutSuffix);
      }
      if (!hit) {
        const fuzzyKey = Array.from(byCode.keys()).find((key) =>
          (codeKey.length >= 4 && codeKey.includes(key)) || (key.length >= 4 && key.includes(codeKey)),
        );
        if (fuzzyKey) {
          hit = byCode.get(fuzzyKey);
        }
      }
      if (!hit && creditNameKey) {
        hit = byName.get(creditNameKey);
      }
      if (!hit && creditNameKey) {
        const fuzzyNameKey = Array.from(byName.keys()).find((key) =>
          (creditNameKey.length >= 8 && creditNameKey.includes(key)) || (key.length >= 8 && key.includes(creditNameKey)),
        );
        if (fuzzyNameKey) {
          hit = byName.get(fuzzyNameKey);
        }
      }
      if (!hit) {
        unmatchedRows.push({ code: criteriaCode, name: creditName });
        continue;
      }

      const documentsRequired = docColumns.map((col) => {
        const raw = String(row[col.idx] ?? "");
        return {
          type: col.type,
          label: col.label,
          requirement: statusIsRequired(raw) ? "Required" : "NA",
          required: statusIsRequired(raw),
        };
      });
      const responsibleRole = parseRole(String(row[responsibleRoleCol] ?? "").trim());
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

    if (updated === 0) {
      const unmatchedPreview = unmatchedRows
        .slice(0, 5)
        .map((row) => `${row.code}${row.name ? ` (${row.name})` : ""}`)
        .join("; ");
      const availablePreview = Array.from(availableProjectCodes).slice(0, 10).join(", ");
      throw new Error(
        `Tracker import did not match any credit codes in this project. ` +
          `Unmatched rows (sample): ${unmatchedPreview || "none detected"}. ` +
          `Available project codes: ${availablePreview || "none seeded"}. ` +
          `Please verify tracker code format or project credit seed.`,
      );
    }

    await ragService.ingestProjectGuidance(params.projectId);
    return { updated };
  }

  async closeCertification(user: CurrentUser, params: {
    projectId: string;
    finalComments: string;
  }) {
    const role = await this.getActorProjectRole(params.projectId, user);
    if (!["project_admin", "super_admin", "super_user"].includes(role ?? "")) {
      throw new Error("Only Project Admin or Super User can close certification.");
    }

    const { data: project } = await this.admin
      .from("projects")
      .select("certification_state")
      .eq("id", params.projectId)
      .single();

    if (project?.certification_state === "CERTIFIED_LOCKED") {
      throw new Error("Project is already certified and locked.");
    }

    const { data: summary } = await this.admin.rpc("get_project_certification_summary", {
      p_project_id: params.projectId
    });

    const snapshotPayload = {
      summary,
      finalComments: params.finalComments,
      closed_by: user.id,
      closed_at: new Date().toISOString()
    };

    const hashInput = JSON.stringify(snapshotPayload) + params.projectId;
    const snapshotHash = createHash("sha256").update(hashInput).digest("hex");

    const { data: snapshot, error: snapshotError } = await this.admin
      .from("certification_snapshots")
      .insert({
        project_id: params.projectId,
        certification_snapshot_hash: snapshotHash,
        snapshot_payload: snapshotPayload,
        created_by: user.id
      })
      .select("id")
      .single();

    if (snapshotError) throw snapshotError;

    const { error: updateError } = await this.admin
      .from("projects")
      .update({
        certification_state: "CERTIFIED_LOCKED",
        certification_block_reason: params.finalComments
      })
      .eq("id", params.projectId);

    if (updateError) throw updateError;
    
    await this.admin.from("audit_logs").insert({
      action_type: 'CERTIFICATION_CLOSED',
      entity_type: 'projects',
      entity_id: params.projectId,
      actor_id: user.id,
      project_id: params.projectId,
      metadata: { snapshot_id: snapshot.id, snapshot_hash: snapshotHash }
    });
  }
}

export const projectService = new ProjectService();
