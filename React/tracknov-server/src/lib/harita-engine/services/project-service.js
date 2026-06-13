"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectService = exports.ProjectService = void 0;
const server_1 = require("@/lib/supabase/server");
const admin_1 = require("@/lib/supabase/admin");
const env_1 = require("@/lib/env");
const rbac_1 = require("@/lib/rbac");
const rag_service_1 = require("./rag-service");
const exceljs_1 = __importDefault(require("exceljs"));
const node_crypto_1 = require("node:crypto");
const GREEN_INTERIORS_SYSTEM = "IGBC Green Interiors";
class ProjectService {
    get client() { return (0, server_1.createClient)(); }
    get admin() { return env_1.env.supabaseServiceRoleKey ? (0, admin_1.createAdminClient)() : this.client; }
    /**
     * Generates a unique project code in format TN-{NAME_KEY}-{RANDOM}
     */
    generateProjectCode(name) {
        const key = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
        const rand = Math.floor(Math.random() * 999).toString().padStart(3, "0");
        return `TN-${key}-${rand}`;
    }
    instantiateProjectCreditsIfMissing(projectId, ratingSystemId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!ratingSystemId)
                return 0;
            const { data: existingCredits } = yield this.admin
                .from("project_credits")
                .select("credit_template_id")
                .eq("project_id", projectId);
            const existingTemplateIds = new Set((existingCredits || []).map(c => c.credit_template_id).filter(Boolean));
            const { data: templates } = yield this.admin
                .from("credit_templates")
                .select("*, category:credit_categories(name)")
                .eq("rating_system_id", ratingSystemId);
            if (!templates || templates.length === 0) {
                throw new Error("No credit templates found for this rating system. Please upload and commit the framework guidebook first.");
            }
            const missingTemplates = templates.filter(t => !existingTemplateIds.has(t.id));
            if (missingTemplates.length > 0) {
                const projectCreditsToInsert = missingTemplates.map((template) => {
                    var _a;
                    return ({
                        project_id: projectId,
                        credit_template_id: template.id,
                        credit_code: template.code,
                        credit_name: template.name,
                        category_id: template.category_id,
                        category_name: (_a = template.category) === null || _a === void 0 ? void 0 : _a.name,
                        max_points: template.max_points || 0,
                        status: "DRAFT",
                    });
                });
                const { error: insertTemplateCreditsError } = yield this.admin
                    .from("project_credits")
                    .insert(projectCreditsToInsert);
                if (insertTemplateCreditsError) {
                    throw insertTemplateCreditsError;
                }
                yield rag_service_1.ragService.ingestProjectGuidance(projectId);
            }
            return missingTemplates.length;
        });
    }
    /**
     * Fetches the role of a user within a specific project.
     */
    getActorProjectRole(projectId, user) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Global L5/L4 roles bypass project-level membership — they always carry their global authority
            if ((0, rbac_1.getRoleLevel)(user.role) >= 4)
                return user.role;
            const { data: membership } = yield this.client
                .from("project_users")
                .select("role")
                .eq("project_id", projectId)
                .eq("user_id", user.id)
                .limit(1)
                .maybeSingle();
            return (_a = membership === null || membership === void 0 ? void 0 : membership.role) !== null && _a !== void 0 ? _a : user.role;
        });
    }
    /**
     * Creates a new project, initializes its team, credits, and default billing.
     */
    createProject(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            if (!(0, rbac_1.canCreateProjects)(user.role)) {
                throw new Error("Unauthorized: Insufficient permissions to create projects.");
            }
            let ratingSystemId = params.ratingSystemId;
            if (!ratingSystemId && params.ratingSystemName) {
                const { data: rs } = yield this.admin
                    .from("rating_systems")
                    .select("id")
                    .eq("name", params.ratingSystemName)
                    .limit(1)
                    .maybeSingle();
                ratingSystemId = rs === null || rs === void 0 ? void 0 : rs.id;
            }
            const projectCode = this.generateProjectCode(params.name);
            const { data: project, error: projectError } = yield this.admin
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
                status: params.state || "active",
                project_code: projectCode,
                created_by: user.id,
            })
                .select("id")
                .single();
            if (projectError || !project) {
                throw projectError !== null && projectError !== void 0 ? projectError : new Error("Failed to create project record.");
            }
            // 1. Initialize membership
            const { error: membershipError } = yield this.admin.from("project_users").insert({
                project_id: project.id,
                user_id: user.id,
                role: user.role === "super_user" ? "super_user" : "super_admin",
            });
            if (membershipError)
                throw membershipError;
            // 2. Instantiate project credits (template-first, fallback to static seed)
            yield this.instantiateProjectCreditsIfMissing(project.id, ratingSystemId !== null && ratingSystemId !== void 0 ? ratingSystemId : null);
            // 3. Initialize default billing
            const { data: starterPlan } = yield this.admin
                .from("subscription_plans")
                .select("code, document_credit_limit, consultant_credit_limit")
                .eq("code", "starter")
                .maybeSingle();
            const defaultPlanCode = (_a = starterPlan === null || starterPlan === void 0 ? void 0 : starterPlan.code) !== null && _a !== void 0 ? _a : "starter";
            const defaultDocumentLimit = Number((_b = starterPlan === null || starterPlan === void 0 ? void 0 : starterPlan.document_credit_limit) !== null && _b !== void 0 ? _b : 250);
            const defaultConsultantLimit = Number((_c = starterPlan === null || starterPlan === void 0 ? void 0 : starterPlan.consultant_credit_limit) !== null && _c !== void 0 ? _c : 40);
            yield this.admin.from("project_billing_settings").upsert({
                project_id: project.id,
                plan_code: defaultPlanCode,
                document_credit_limit: defaultDocumentLimit,
                consultant_credit_limit: defaultConsultantLimit,
                updated_by: user.id,
            }, { onConflict: "project_id" });
            return project;
        });
    }
    /**
     * Joins a project using a human-readable project code.
     */
    joinProjectByCode(user, projectCode) {
        return __awaiter(this, void 0, void 0, function* () {
            // Sanitize: Trim, Upper, and handle common delimiters (spaces/hyphens)
            const cleanedCode = projectCode.trim().toUpperCase().replace(/\s+/g, '-');
            const { data: project, error: fetchError } = yield this.admin
                .from("projects")
                .select("id, name")
                .eq("project_code", cleanedCode)
                .maybeSingle();
            if (fetchError) {
                throw new Error(`Database error: ${fetchError.message}`);
            }
            if (!project) {
                console.warn(`[ProjectService] Project code not found: ${cleanedCode}`);
                throw new Error(`Project code not found: ${cleanedCode}`);
            }
            // Ensure profile exists before linking
            const { data: profile } = yield this.admin
                .from("profiles")
                .select("user_id")
                .eq("user_id", user.id)
                .maybeSingle();
            if (!profile) {
                yield this.admin.from("profiles").insert({
                    user_id: user.id,
                    email: user.email,
                    full_name: "Project member",
                });
            }
            const { error: insertError } = yield this.admin.from("project_users").insert({
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
        });
    }
    /**
     * Updates an existing project's metadata.
     */
    updateProject(user, projectId, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const role = yield this.getActorProjectRole(projectId, user);
            if (!(0, rbac_1.canManageProject)(role)) {
                throw new Error("Unauthorized: Insufficient permissions to update project.");
            }
            if (params.state === "APPROVED") {
                const { data: credits } = yield this.admin
                    .from("project_credits")
                    .select("id, status")
                    .eq("project_id", projectId);
                const hasOpenCredits = (credits !== null && credits !== void 0 ? credits : []).some((credit) => {
                    return credit.status !== "APPROVED" && credit.status !== "CLOSED";
                });
                if (hasOpenCredits) {
                    throw new Error("Cannot approve project: open credits still exist.");
                }
            }
            const { error } = yield this.admin
                .from("projects")
                .update({
                name: params.name,
                client: params.clientName,
                location: params.location,
                certification_type: params.ratingSystem,
                status: params.state,
            })
                .eq("id", projectId);
            if (error)
                throw error;
        });
    }
    uploadProjectGuidebook(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const role = yield this.getActorProjectRole(params.projectId, user);
            if (!(0, rbac_1.canManageProjectGuidebook)(role)) {
                throw new Error("Only Project Admin or Super User can upload the project guidebook.");
            }
            const lowerName = params.file.name.toLowerCase();
            if (!lowerName.endsWith(".pdf")) {
                throw new Error("Guidebook must be a PDF file.");
            }
            if (params.file.size > 50 * 1024 * 1024) {
                throw new Error("Guidebook file is too large. Max supported size is 50 MB.");
            }
            if ((0, rbac_1.getRoleLevel)(role) !== 5) {
                // Guidebook execution freeze check
                const [{ count: docCount }, { count: assignmentCount }] = yield Promise.all([
                    this.admin.from("project_document").select("*", { count: "exact", head: true }).eq("project_id", params.projectId),
                    this.admin.from("assignments").select("*", { count: "exact", head: true }).eq("project_id", params.projectId).eq("is_active", true)
                ]);
                if ((docCount !== null && docCount !== void 0 ? docCount : 0) > 0 || (assignmentCount !== null && assignmentCount !== void 0 ? assignmentCount : 0) > 0) {
                    throw new Error("Guidebook is immutable because project execution has already begun. Only a Super User can override this lock.");
                }
            }
            const safeTitle = ((_a = params.title) !== null && _a !== void 0 ? _a : params.file.name.replace(/\.[^.]+$/, "")).trim().slice(0, 200) || "IGBC Guidebook";
            const sanitizedBase = params.file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "_").slice(0, 80) || "guidebook";
            const filePath = `${params.projectId}/guidebooks/${Date.now()}-${(0, node_crypto_1.randomUUID)()}-${sanitizedBase}.pdf`;
            const { data: existingGuidebook } = yield this.admin
                .from("project_guidebooks")
                .select("id, file_path")
                .eq("project_id", params.projectId)
                .eq("file_name", params.file.name)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            const { error: uploadError } = yield this.admin.storage
                .from("project-documents")
                .upload(filePath, params.file, { upsert: false, contentType: "application/pdf" });
            if (uploadError)
                throw uploadError;
            const writePayload = {
                project_id: params.projectId,
                title: safeTitle,
                file_name: params.file.name,
                file_path: filePath,
                uploaded_by: user.id,
            };
            let writeError = null;
            if (existingGuidebook === null || existingGuidebook === void 0 ? void 0 : existingGuidebook.id) {
                const { error } = yield this.admin
                    .from("project_guidebooks")
                    .update(writePayload)
                    .eq("id", existingGuidebook.id);
                writeError = error;
                if (!error && existingGuidebook.file_path && existingGuidebook.file_path !== filePath) {
                    yield this.admin.storage.from("project-documents").remove([existingGuidebook.file_path]);
                }
            }
            else {
                const { error } = yield this.admin.from("project_guidebooks").insert(writePayload);
                writeError = error;
            }
            if (writeError) {
                yield this.admin.storage.from("project-documents").remove([filePath]);
                throw writeError;
            }
            // Self-heal: uploading the project guidebook must always lead to an instantiated workspace.
            const { data: projectMeta } = yield this.admin
                .from("projects")
                .select("rating_system_id")
                .eq("id", params.projectId)
                .maybeSingle();
            yield this.instantiateProjectCreditsIfMissing(params.projectId, (_b = projectMeta === null || projectMeta === void 0 ? void 0 : projectMeta.rating_system_id) !== null && _b !== void 0 ? _b : null);
            // Ingest real PDF content into Harita's RAG memory.
            // Fetch the saved guidebook row to get its id.
            const { data: savedGuidebook } = yield this.admin
                .from("project_guidebooks")
                .select("id")
                .eq("project_id", params.projectId)
                .eq("file_path", filePath)
                .maybeSingle();
            if (savedGuidebook === null || savedGuidebook === void 0 ? void 0 : savedGuidebook.id) {
                // Run ingestion asynchronously — don't block the upload response
                rag_service_1.ragService
                    .ingestGuidebookPdf({
                    projectId: params.projectId,
                    guidebookId: savedGuidebook.id,
                    filePath,
                    fileName: params.file.name,
                })
                    .catch((err) => {
                    console.error("[project-service] Guidebook PDF ingestion failed silently:", err);
                });
            }
        });
    }
    uploadProjectDataTable(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const role = yield this.getActorProjectRole(params.projectId, user);
            if (!(0, rbac_1.canManageProjectGuidebook)(role)) {
                throw new Error("Only Project Admin or Super User can upload the data table.");
            }
            const lowerName = params.file.name.toLowerCase();
            if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls") && !lowerName.endsWith(".csv")) {
                throw new Error("Data Table must be an Excel (.xlsx/.xls) or CSV file.");
            }
            if (params.file.size > 50 * 1024 * 1024) {
                throw new Error("File is too large. Max supported size is 50 MB.");
            }
            if ((0, rbac_1.getRoleLevel)(role) !== 5) {
                const [{ count: docCount }, { count: assignmentCount }] = yield Promise.all([
                    this.admin.from("project_document").select("*", { count: "exact", head: true }).eq("project_id", params.projectId),
                    this.admin.from("assignments").select("*", { count: "exact", head: true }).eq("project_id", params.projectId).eq("is_active", true)
                ]);
                if ((docCount !== null && docCount !== void 0 ? docCount : 0) > 0 || (assignmentCount !== null && assignmentCount !== void 0 ? assignmentCount : 0) > 0) {
                    throw new Error("Data Table is immutable because project execution has already begun.");
                }
            }
            const safeTitle = ((_a = params.title) !== null && _a !== void 0 ? _a : params.file.name.replace(/\.[^.]+$/, "")).trim().slice(0, 200) || "Data Table";
            const sanitizedBase = params.file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "_").slice(0, 80) || "datatable";
            // We can reuse the project-documents bucket since it's already there
            const filePath = `${params.projectId}/datatables/${Date.now()}-${(0, node_crypto_1.randomUUID)()}-${sanitizedBase}${lowerName.substring(lowerName.lastIndexOf('.'))}`;
            const { data: existingDataTable } = yield this.admin
                .from("project_data_tables")
                .select("id, file_path")
                .eq("project_id", params.projectId)
                .eq("file_name", params.file.name)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            const { error: uploadError } = yield this.admin.storage
                .from("project-documents")
                .upload(filePath, params.file, { upsert: false });
            if (uploadError)
                throw uploadError;
            const writePayload = {
                project_id: params.projectId,
                title: safeTitle,
                file_name: params.file.name,
                file_path: filePath,
                uploaded_by: user.id,
            };
            let writeError = null;
            if (existingDataTable === null || existingDataTable === void 0 ? void 0 : existingDataTable.id) {
                const { error } = yield this.admin
                    .from("project_data_tables")
                    .update(writePayload)
                    .eq("id", existingDataTable.id);
                writeError = error;
                if (!error && existingDataTable.file_path && existingDataTable.file_path !== filePath) {
                    yield this.admin.storage.from("project-documents").remove([existingDataTable.file_path]);
                }
            }
            else {
                const { error } = yield this.admin.from("project_data_tables").insert(writePayload);
                writeError = error;
            }
            if (writeError) {
                yield this.admin.storage.from("project-documents").remove([filePath]);
                throw writeError;
            }
        });
    }
    deleteProject(user, projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(0, rbac_1.canDeleteProjects)(user.role)) {
                throw new Error("Unauthorized: Strictly restricted to Super Users.");
            }
            const { error } = yield this.admin.from("projects").delete().eq("id", projectId);
            if (error)
                throw error;
        });
    }
    importTrackerBaseline(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            const role = yield this.getActorProjectRole(params.projectId, user);
            if (!(0, rbac_1.canManageProjectGuidebook)(role)) {
                throw new Error("Only Project Admin or Super User can import tracker baseline.");
            }
            const fileName = params.file.name.toLowerCase();
            if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
                throw new Error("Tracker import supports only .xlsx/.xls files.");
            }
            if ((0, rbac_1.getRoleLevel)(role) !== 5) {
                // Tracker execution freeze check
                const [{ count: docCount }, { count: assignmentCount }] = yield Promise.all([
                    this.admin.from("project_document").select("*", { count: "exact", head: true }).eq("project_id", params.projectId),
                    this.admin.from("assignments").select("*", { count: "exact", head: true }).eq("project_id", params.projectId).eq("is_active", true)
                ]);
                if ((docCount !== null && docCount !== void 0 ? docCount : 0) > 0 || (assignmentCount !== null && assignmentCount !== void 0 ? assignmentCount : 0) > 0) {
                    throw new Error("Tracker is immutable because project execution has already begun. Only a Super User can override this lock.");
                }
            }
            // Self-heal before import: ensure project credit rows exist.
            const { data: projectMeta } = yield this.admin
                .from("projects")
                .select("rating_system_id")
                .eq("id", params.projectId)
                .maybeSingle();
            yield this.instantiateProjectCreditsIfMissing(params.projectId, (_a = projectMeta === null || projectMeta === void 0 ? void 0 : projectMeta.rating_system_id) !== null && _a !== void 0 ? _a : null);
            const arrayBuffer = yield params.file.arrayBuffer();
            const workbook = new exceljs_1.default.Workbook();
            yield workbook.xlsx.load(arrayBuffer);
            const trackerSheet = workbook.worksheets.find(ws => ws.name.toLowerCase().includes("document tracker")) || workbook.worksheets[0];
            if (!trackerSheet)
                throw new Error("No worksheet found in tracker file.");
            const rows = [];
            trackerSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
                var _a;
                const rowData = [];
                // ExcelJS row.values is 1-indexed, first element is null/undefined
                for (let i = 1; i <= trackerSheet.columnCount; i++) {
                    rowData.push((_a = row.getCell(i).value) !== null && _a !== void 0 ? _a : "");
                }
                rows.push(rowData);
            });
            if (rows.length < 2)
                throw new Error("Tracker sheet is empty.");
            const normalize = (value) => value.toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
            const extractStructuredCode = (value) => {
                const upper = value.toString().toUpperCase();
                const match = upper.match(/([A-Z]{2,4})\s*(?:CREDIT|C|MR|MREQ|MANDATORY\s+REQUIREMENT)?\s*([0-9]{1,2}(?:\.[0-9]{1,2})?)/);
                if (!match)
                    return null;
                const [, prefix, num] = match;
                return `${prefix} C${num}`;
            };
            const codeVariants = (value) => {
                const original = value.toString().trim();
                const upper = original.toUpperCase();
                const variants = new Set();
                const push = (v) => {
                    const n = normalize(v);
                    if (n)
                        variants.add(n);
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
            const parseRole = (value) => {
                const v = value.toString().toLowerCase();
                if (v.includes("mep"))
                    return "mep";
                if (v.includes("architect"))
                    return "architect";
                if (v.includes("contractor"))
                    return "contractor";
                if (v.includes("owner") || v.includes("project owner") || v.includes("pm") || v.includes("project manager"))
                    return "owner";
                if (v.includes("client"))
                    return "client";
                if (v.includes("project admin") || v.includes("enov"))
                    return "project_admin";
                return null;
            };
            const statusIsRequired = (value) => {
                const normalized = value.toString().trim().toLowerCase();
                if (!normalized || normalized === "na")
                    return false;
                return true;
            };
            const normalizeHeader = (value) => value.toString().toLowerCase().replace(/[^a-z0-9]/g, "");
            const headerRowIndex = rows.findIndex((row) => {
                const cells = (row !== null && row !== void 0 ? row : []).map((cell) => normalizeHeader(String(cell !== null && cell !== void 0 ? cell : "")));
                return cells.some((cell) => cell.includes("criteria")) && cells.some((cell) => cell.includes("creditname"));
            });
            const resolvedHeaderIndex = headerRowIndex >= 0 ? headerRowIndex : 1;
            const headerRow = (_b = rows[resolvedHeaderIndex]) !== null && _b !== void 0 ? _b : [];
            const findColumn = (aliases, fallback) => {
                var _a;
                for (let i = 0; i < headerRow.length; i += 1) {
                    const headerCell = normalizeHeader(String((_a = headerRow[i]) !== null && _a !== void 0 ? _a : ""));
                    if (!headerCell)
                        continue;
                    if (aliases.some((alias) => headerCell.includes(alias)))
                        return i;
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
            ];
            const { data: projectCredits, error: projectCreditsError } = yield this.admin
                .from("project_credits")
                .select("id, credit_code, credit_name")
                .eq("project_id", params.projectId);
            if (projectCreditsError)
                throw projectCreditsError;
            const { data: legacyCredits } = yield this.admin
                .from("credits")
                .select("id, credit_code, credit_name")
                .eq("project_id", params.projectId);
            const byCode = new Map();
            const byName = new Map();
            const availableProjectCodes = new Set();
            for (const credit of projectCredits !== null && projectCredits !== void 0 ? projectCredits : []) {
                const code = String((_c = credit.credit_code) !== null && _c !== void 0 ? _c : "");
                if (code)
                    availableProjectCodes.add(code.trim());
                const name = normalize(String((_d = credit.credit_name) !== null && _d !== void 0 ? _d : ""));
                for (const key of codeVariants(code)) {
                    byCode.set(key, { id: credit.id, table: "project_credits" });
                }
                if (name)
                    byName.set(name, { id: credit.id, table: "project_credits" });
            }
            for (const credit of legacyCredits !== null && legacyCredits !== void 0 ? legacyCredits : []) {
                const code = String((_e = credit.credit_code) !== null && _e !== void 0 ? _e : "");
                for (const key of codeVariants(code)) {
                    if (!byCode.has(key))
                        byCode.set(key, { id: credit.id, table: "credits" });
                }
                const nameKey = normalize(String((_f = credit.credit_name) !== null && _f !== void 0 ? _f : ""));
                if (nameKey && !byName.has(nameKey))
                    byName.set(nameKey, { id: credit.id, table: "credits" });
            }
            let updated = 0;
            const unmatchedRows = [];
            for (let r = resolvedHeaderIndex + 1; r < rows.length; r += 1) {
                const row = (_g = rows[r]) !== null && _g !== void 0 ? _g : [];
                const criteriaCode = String((_h = row[criteriaCol]) !== null && _h !== void 0 ? _h : "").trim();
                const creditName = String((_j = row[creditNameCol]) !== null && _j !== void 0 ? _j : "").trim();
                const docsRequiredText = String((_k = row[docsSummaryCol]) !== null && _k !== void 0 ? _k : "").trim();
                if (!criteriaCode || !creditName)
                    continue;
                const rawCode = criteriaCode.replace(/\s+/g, " ").trim();
                const codeKeys = codeVariants(rawCode);
                const codeKey = (_l = codeKeys[0]) !== null && _l !== void 0 ? _l : "";
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
                    const fuzzyKey = Array.from(byCode.keys()).find((key) => (codeKey.length >= 4 && codeKey.includes(key)) || (key.length >= 4 && key.includes(codeKey)));
                    if (fuzzyKey) {
                        hit = byCode.get(fuzzyKey);
                    }
                }
                if (!hit && creditNameKey) {
                    hit = byName.get(creditNameKey);
                }
                if (!hit && creditNameKey) {
                    const fuzzyNameKey = Array.from(byName.keys()).find((key) => (creditNameKey.length >= 8 && creditNameKey.includes(key)) || (key.length >= 8 && key.includes(creditNameKey)));
                    if (fuzzyNameKey) {
                        hit = byName.get(fuzzyNameKey);
                    }
                }
                if (!hit) {
                    unmatchedRows.push({ code: criteriaCode, name: creditName });
                    continue;
                }
                const documentsRequired = docColumns.map((col) => {
                    var _a;
                    const raw = String((_a = row[col.idx]) !== null && _a !== void 0 ? _a : "");
                    return {
                        type: col.type,
                        label: col.label,
                        requirement: statusIsRequired(raw) ? "Required" : "NA",
                        required: statusIsRequired(raw),
                    };
                });
                const responsibleRole = parseRole(String((_m = row[responsibleRoleCol]) !== null && _m !== void 0 ? _m : "").trim());
                const patch = {
                    documents_required: documentsRequired,
                    what_to_submit: docsRequiredText || null,
                    responsible_role: responsibleRole,
                };
                if (hit.table === "project_credits") {
                    const { error } = yield this.admin.from("project_credits").update(patch).eq("id", hit.id);
                    if (error) {
                        const { error: fallbackError } = yield this.admin.from("credits").update(patch).eq("project_id", params.projectId).ilike("credit_code", criteriaCode);
                        if (fallbackError)
                            continue;
                    }
                }
                else {
                    const { error } = yield this.admin.from("credits").update(patch).eq("id", hit.id);
                    if (error)
                        continue;
                }
                updated += 1;
            }
            if (updated === 0) {
                const unmatchedPreview = unmatchedRows
                    .slice(0, 5)
                    .map((row) => `${row.code}${row.name ? ` (${row.name})` : ""}`)
                    .join("; ");
                const availablePreview = Array.from(availableProjectCodes).slice(0, 10).join(", ");
                throw new Error(`Tracker import did not match any credit codes in this project. ` +
                    `Unmatched rows (sample): ${unmatchedPreview || "none detected"}. ` +
                    `Available project codes: ${availablePreview || "none seeded"}. ` +
                    `Please verify tracker code format or project credit seed.`);
            }
            yield rag_service_1.ragService.ingestProjectGuidance(params.projectId);
            return { updated };
        });
    }
    closeCertification(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const role = yield this.getActorProjectRole(params.projectId, user);
            if (!["project_admin", "super_admin", "super_user"].includes(role !== null && role !== void 0 ? role : "")) {
                throw new Error("Only Project Admin or Super User can close certification.");
            }
            const { data: project } = yield this.admin
                .from("projects")
                .select("certification_state")
                .eq("id", params.projectId)
                .single();
            if ((project === null || project === void 0 ? void 0 : project.certification_state) === "CERTIFIED_LOCKED") {
                throw new Error("Project is already certified and locked.");
            }
            const { data: summary } = yield this.admin.rpc("get_project_certification_summary", {
                p_project_id: params.projectId
            });
            const snapshotPayload = {
                summary,
                finalComments: params.finalComments,
                closed_by: user.id,
                closed_at: new Date().toISOString()
            };
            const hashInput = JSON.stringify(snapshotPayload) + params.projectId;
            const snapshotHash = (0, node_crypto_1.createHash)("sha256").update(hashInput).digest("hex");
            const { data: snapshot, error: snapshotError } = yield this.admin
                .from("certification_snapshots")
                .insert({
                project_id: params.projectId,
                certification_snapshot_hash: snapshotHash,
                snapshot_payload: snapshotPayload,
                created_by: user.id
            })
                .select("id")
                .single();
            if (snapshotError)
                throw snapshotError;
            const { error: updateError } = yield this.admin
                .from("projects")
                .update({
                certification_state: "CERTIFIED_LOCKED",
                certification_block_reason: params.finalComments
            })
                .eq("id", params.projectId);
            if (updateError)
                throw updateError;
            yield this.admin.from("audit_logs").insert({
                action_type: 'CERTIFICATION_CLOSED',
                entity_type: 'projects',
                entity_id: params.projectId,
                actor_id: user.id,
                project_id: params.projectId,
                metadata: { snapshot_id: snapshot.id, snapshot_hash: snapshotHash }
            });
        });
    }
}
exports.ProjectService = ProjectService;
exports.projectService = new ProjectService();
