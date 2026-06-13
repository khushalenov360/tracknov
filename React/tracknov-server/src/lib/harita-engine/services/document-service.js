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
exports.documentService = exports.DocumentService = void 0;
const uuid_1 = require("uuid");
const server_1 = require("@/lib/supabase/server");
const admin_1 = require("@/lib/supabase/admin");
const env_1 = require("@/lib/env");
const rbac_1 = require("@/lib/rbac");
const activity_service_1 = require("./activity-service");
const notification_service_1 = require("./notification-service");
const ai_service_1 = require("./ai-service");
const document_intelligence_service_1 = require("./document-intelligence-service");
const workflow_orchestrator_service_1 = require("./workflow-orchestrator-service");
const orchestrator_1 = require("@/core/runtime/orchestrator");
const event_bus_1 = require("@/lib/core/events/event-bus");
const crypto_1 = __importDefault(require("crypto"));
class DocumentService {
    get client() { return (0, server_1.createClient)(); }
    get admin() { return env_1.env.supabaseServiceRoleKey ? (0, admin_1.createAdminClient)() : this.client; }
    isL0Role(role) {
        return ["consultant", "architect", "mep", "contractor"].includes(String(role).toLowerCase());
    }
    getActorProjectRole(projectId, user) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (user.role === "super_user")
                return "super_user";
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
    getClientUserForProject(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { data } = yield this.admin
                .from("project_users")
                .select("user_id")
                .eq("project_id", projectId)
                .eq("role", "client")
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle();
            return (_a = data === null || data === void 0 ? void 0 : data.user_id) !== null && _a !== void 0 ? _a : null;
        });
    }
    getProjectCreditAssignment(projectCreditId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data, error } = yield this.admin
                .from("project_credits")
                .select("id, credit_code, credit_name, assigned_user_id, responsible_role, documents_required, what_to_submit")
                .eq("id", projectCreditId)
                .maybeSingle();
            if (error)
                throw error;
            return data;
        });
    }
    resolveCreditStageId(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const { projectCreditId, creditId } = params;
            const preferredStages = ["DESIGN", "CONSTRUCTION"];
            const { data: existingByProjectCredit } = yield this.admin
                .from("credit_stages")
                .select("id, stage")
                .eq("project_credit_id", projectCreditId)
                .order("created_at", { ascending: true });
            const rankedExisting = (_a = (existingByProjectCredit !== null && existingByProjectCredit !== void 0 ? existingByProjectCredit : []).sort((a, b) => {
                var _a, _b;
                const rankA = preferredStages.indexOf(String((_a = a.stage) !== null && _a !== void 0 ? _a : "").toUpperCase());
                const rankB = preferredStages.indexOf(String((_b = b.stage) !== null && _b !== void 0 ? _b : "").toUpperCase());
                return (rankA === -1 ? 99 : rankA) - (rankB === -1 ? 99 : rankB);
            })) !== null && _a !== void 0 ? _a : [];
            if ((_b = rankedExisting[0]) === null || _b === void 0 ? void 0 : _b.id) {
                return rankedExisting[0].id;
            }
            const { data: seededStage, error: seedError } = yield this.admin
                .from("credit_stages")
                .insert({
                project_credit_id: projectCreditId,
                credit_id: creditId,
                stage: "DESIGN",
                state: "DRAFT",
            })
                .select("id")
                .single();
            if (seedError || !(seededStage === null || seededStage === void 0 ? void 0 : seededStage.id)) {
                throw new Error((_c = seedError === null || seedError === void 0 ? void 0 : seedError.message) !== null && _c !== void 0 ? _c : "Unable to create credit stage for this mapped credit. Please contact Project Admin.");
            }
            return seededStage.id;
        });
    }
    assertL0AssignmentAccess(args) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            if (!this.isL0Role(args.actorRole))
                return;
            const projectCreditId = String((_b = (_a = args.mappedCredit) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : "").trim();
            const docCategory = String((_c = args.docCategory) !== null && _c !== void 0 ? _c : "").trim();
            if (projectCreditId) {
                if (docCategory) {
                    const { data: slotAssignments, error: slotError } = yield this.admin
                        .from("assignments")
                        .select("user_id")
                        .eq("project_credit_id", projectCreditId)
                        .eq("document_type", docCategory)
                        .eq("is_active", true);
                    if (!slotError && (slotAssignments !== null && slotAssignments !== void 0 ? slotAssignments : []).length > 0) {
                        if ((slotAssignments !== null && slotAssignments !== void 0 ? slotAssignments : []).some((assignment) => assignment.user_id === args.actorUserId)) {
                            return;
                        }
                        throw new Error("This document requirement is assigned to a different owner.");
                    }
                }
                const { data: assignmentMatch, error: assignmentError } = yield this.admin.rpc("is_assigned_user", {
                    p_project_credit_id: projectCreditId,
                    p_user_id: args.actorUserId,
                });
                if (!assignmentError && assignmentMatch === true) {
                    return;
                }
            }
            const assignedUserId = (_d = args.mappedCredit) === null || _d === void 0 ? void 0 : _d.assigned_user_id;
            const responsibleRole = String((_f = (_e = args.mappedCredit) === null || _e === void 0 ? void 0 : _e.responsible_role) !== null && _f !== void 0 ? _f : "").toLowerCase().trim();
            if (assignedUserId && assignedUserId !== args.actorUserId) {
                throw new Error("This credit is assigned to a different owner. Only the assigned owner can upload or update here.");
            }
            if (!assignedUserId && responsibleRole && responsibleRole !== String(args.actorRole).toLowerCase()) {
                throw new Error(`This credit is mapped to ${responsibleRole}. Your role cannot upload or update here.`);
            }
        });
    }
    uploadDocument(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            const uploadStartTime = Date.now();
            const actorRole = yield this.getActorProjectRole(params.projectId, user);
            if (!actorRole || !(0, rbac_1.canUploadProjectDocuments)(actorRole)) {
                throw new Error("Unauthorized: You do not have upload access for this project.");
            }
            // SECTION 12: Emergency Kill Switch
            const { data: uploadControl } = yield this.admin
                .from("system_controls")
                .select("is_enabled")
                .eq("feature_name", "uploads")
                .single();
            if (uploadControl && !uploadControl.is_enabled) {
                throw new Error("Document uploads are currently suspended by system administration. Please try again later.");
            }
            let projectCreditId = params.projectCreditId;
            let creditId = params.creditId;
            if (!projectCreditId && creditId) {
                const { data: mappedProjectCredit } = yield this.admin
                    .from("project_credits")
                    .select("id")
                    .eq("project_id", params.projectId)
                    .eq("credit_id", creditId)
                    .maybeSingle();
                projectCreditId = mappedProjectCredit === null || mappedProjectCredit === void 0 ? void 0 : mappedProjectCredit.id;
            }
            else if (projectCreditId && !creditId) {
                const { data: mappedProjectCredit } = yield this.admin
                    .from("project_credits")
                    .select("credit_id")
                    .eq("id", projectCreditId)
                    .maybeSingle();
                creditId = mappedProjectCredit === null || mappedProjectCredit === void 0 ? void 0 : mappedProjectCredit.credit_id;
                // Mutate params so subsequent calls use the resolved creditId
                params.creditId = creditId;
            }
            if (!projectCreditId) {
                throw new Error("Project credit mapping not found.");
            }
            const mappedCredit = yield this.getProjectCreditAssignment(projectCreditId);
            if (!mappedCredit) {
                throw new Error("Mapped project credit is missing.");
            }
            // P1 enforcement: L0 uploader must match assignment on this mapped credit.
            yield this.assertL0AssignmentAccess({
                actorRole: String(actorRole),
                actorUserId: user.id,
                mappedCredit,
                docCategory: params.docCategory,
            });
            const validation = yield ai_service_1.aiService.validateUploadCandidate({
                projectId: params.projectId,
                creditId: params.creditId,
                projectCreditId: projectCreditId,
                fileName: params.file.name,
                fileType: params.file.type,
                fileSize: params.file.size,
                docCategory: params.docCategory,
            });
            if (!validation.ok) {
                throw new Error(validation.errors.join(" "));
            }
            const clientUserId = yield this.getClientUserForProject(params.projectId);
            if (!clientUserId) {
                throw new Error("Client wallet is not linked for this project yet.");
            }
            // Quota check
            const { data: usage } = yield this.admin
                .from("project_usage_summary")
                .select("documents_used, document_credit_limit, topup_document_credits")
                .eq("project_id", params.projectId)
                .maybeSingle();
            const allowedDocuments = Number((_a = usage === null || usage === void 0 ? void 0 : usage.document_credit_limit) !== null && _a !== void 0 ? _a : 0) + Number((_b = usage === null || usage === void 0 ? void 0 : usage.topup_document_credits) !== null && _b !== void 0 ? _b : 0);
            const usedDocuments = Number((_c = usage === null || usage === void 0 ? void 0 : usage.documents_used) !== null && _c !== void 0 ? _c : 0);
            if (allowedDocuments > 0 && usedDocuments >= allowedDocuments) {
                throw new Error("Document credit limit reached for this project plan.");
            }
            // Submittal Management (Execution Unit)
            const creditStageId = yield this.resolveCreditStageId({
                projectCreditId,
                creditId: params.creditId,
            });
            const { data: activeSubmittal } = yield this.admin
                .from("submittals")
                .select("id")
                .eq("credit_stage_id", creditStageId)
                .in("state", ["ASSIGNED", "IN_PROGRESS", "CLARIFICATION"])
                .order("iteration", { ascending: false })
                .limit(1)
                .maybeSingle();
            let submittalId = activeSubmittal === null || activeSubmittal === void 0 ? void 0 : activeSubmittal.id;
            if (!submittalId) {
                const { data: newSubmittal, error: createSubError } = yield this.admin
                    .from("submittals")
                    .insert({
                    credit_stage_id: creditStageId,
                    project_id: params.projectId,
                    credit_id: params.creditId,
                    type: params.docCategory,
                    state: "ASSIGNED",
                    iteration: 1,
                    created_by: user.id
                })
                    .select("id")
                    .single();
                if (createSubError)
                    throw createSubError;
                submittalId = newSubmittal.id;
            }
            // Versioning
            const { data: latestVersion } = yield this.admin
                .from("project_document")
                .select("id, version")
                .eq("project_id", params.projectId)
                .eq("project_credit_id", projectCreditId)
                .eq("doc_category", params.docCategory)
                .eq("is_latest", true)
                .order("version", { ascending: false })
                .limit(1)
                .maybeSingle();
            const nextVersion = Number((_d = latestVersion === null || latestVersion === void 0 ? void 0 : latestVersion.version) !== null && _d !== void 0 ? _d : 0) + 1;
            const extension = (_f = (_e = params.file.name.split(".").pop()) === null || _e === void 0 ? void 0 : _e.toLowerCase()) !== null && _f !== void 0 ? _f : "bin";
            const safeDocType = params.docCategory.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
            const safeBaseName = params.file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "_").slice(0, 80) || "file";
            const filePath = `${params.projectId}/${projectCreditId}/${safeDocType}/v${nextVersion}-${(0, uuid_1.v4)()}-${safeBaseName}.${extension}`;
            // Calculate Hash for Checksum Verification (Section 7)
            const fileBuffer = Buffer.from(yield params.file.arrayBuffer());
            const serverChecksum = crypto_1.default.createHash('sha256').update(fileBuffer).digest('hex');
            if (params.clientChecksum && params.clientChecksum !== serverChecksum) {
                throw new Error("Checksum mismatch: The uploaded file may be corrupted. Please retry.");
            }
            // Upload to Storage
            const { error: storageError } = yield this.admin.storage.from("project-documents").upload(filePath, params.file, {
                upsert: false,
                contentType: params.file.type || undefined,
            });
            if (storageError)
                throw storageError;
            // Route to correct review level:
            // L0 (architect/contractor/mep/client) → SUBMITTED → L1 (owner/PM) reviews
            // L1 (owner) → UNDER_REVIEW → L3 (project_admin) validates (L2 has no role)
            // L3+ (project_admin/super_admin/super_user) → UNDER_REVIEW → peer L3 validates
            const initialState = this.isL0Role(actorRole) ? "L1_REVIEW" : "UNDER_L3_REVIEW";
            const mergedNotes = [
                params.notes,
                params.requirementSlot ? `Requirement slot: ${params.requirementSlot}` : "",
                validation.warnings.length ? `AI precheck warnings: ${validation.warnings.join(" | ")}` : "",
            ].filter(Boolean).join("\n");
            const { data: documentId, error: dbError } = yield this.admin.rpc("insert_document_and_consume_tokens", {
                p_project_id: params.projectId,
                p_credit_id: params.creditId || null,
                p_project_credit_id: projectCreditId,
                p_submittal_id: submittalId,
                p_uploaded_by: user.id,
                p_file_name: params.file.name,
                p_file_path: filePath,
                p_file_type: extension,
                p_doc_category: params.docCategory,
                p_notes: mergedNotes,
                p_status: initialState,
                p_version: nextVersion,
                p_is_latest: true,
                p_parent_document_id: (_g = latestVersion === null || latestVersion === void 0 ? void 0 : latestVersion.id) !== null && _g !== void 0 ? _g : null,
                p_client_user_id: clientUserId,
                p_tokens: 1,
                p_reason: "Document upload token burn",
                p_actor_id: user.id,
                p_token_meta: {
                    file_name: params.file.name,
                    doc_category: params.docCategory,
                    version: nextVersion,
                },
                p_file_hash: serverChecksum,
                p_idempotency_key: params.idempotencyKey,
            });
            if (dbError || !documentId) {
                // SECTION 7: Purge partial binary on metadata failure
                yield this.admin.storage.from("project-documents").remove([filePath]);
                throw dbError !== null && dbError !== void 0 ? dbError : new Error("Upload record could not be saved.");
            }
            const uploadDurationMs = Date.now() - uploadStartTime;
            yield this.admin
                .from("project_document")
                .update({
                file_size_bytes: params.file.size,
                mime_type: params.file.type,
                upload_origin: "web",
                upload_duration_ms: uploadDurationMs,
                compression_applied: false
            })
                .eq("id", documentId);
            try {
                yield this.admin
                    .from("upload_attempts")
                    .insert({
                    project_id: params.projectId,
                    user_id: user.id,
                    file_name: params.file.name,
                    file_size_bytes: params.file.size,
                    mime_type: params.file.type,
                    upload_origin: "web",
                    status: "SUCCESS",
                    upload_duration_ms: uploadDurationMs,
                    compression_applied: false
                });
            }
            catch (telemetryError) {
                // Silently fail telemetry logging to not interrupt main flow
            }
            // Inactivate the assignment now that the requirement is fulfilled (clears the backlog)
            yield this.admin
                .from("assignments")
                .update({ is_active: false })
                .eq("project_credit_id", projectCreditId)
                .eq("user_id", user.id)
                .or(`document_type.eq.${params.docCategory},document_type.is.null`);
            // Remediation 02: Activate Submittal Lifecycle (ASSIGNED -> L1_REVIEW)
            if (submittalId) {
                yield this.admin
                    .from("submittals")
                    .update({ state: "L1_REVIEW", updated_at: new Date().toISOString() })
                    .eq("id", submittalId)
                    .eq("state", "ASSIGNED");
            }
            // telemetry done
            // Post-upload side effects
            yield (0, activity_service_1.logDocumentActivity)(this.admin, {
                documentId,
                projectId: params.projectId,
                action: "uploaded",
                actorId: user.id,
                actorRole,
                summary: `Uploaded ${params.file.name} under ${params.docCategory}.`,
                details: {
                    file_name: params.file.name,
                    doc_category: params.docCategory,
                    version: nextVersion,
                    checksum: serverChecksum,
                },
            });
            const ownerIds = yield (0, notification_service_1.getProjectMembersByRoles)(this.admin, params.projectId, ["owner"]);
            yield (0, notification_service_1.notifyUsers)(this.admin, {
                projectId: params.projectId,
                creditId: params.creditId,
                documentId,
                userIds: ownerIds,
                body: `New upload received for Project Manager (PM) review: ${params.file.name}`,
                actionUrl: `/documents?project=${params.projectId}&document=${documentId}`,
            });
            // Trigger Document Intelligence Analysis (V2 Update)
            void document_intelligence_service_1.documentIntelligenceService.analyzeDocument(documentId).catch((err) => {
                // Silently fail to not interrupt main flow
            });
            // Emit Event
            yield event_bus_1.eventBus.emit({
                type: "DOCUMENT_UPLOADED",
                payload: {
                    documentId,
                    projectId: params.projectId,
                    userId: user.id,
                }
            });
            return { id: documentId };
        });
    }
    updateMetadata(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const actorRole = yield this.getActorProjectRole(params.projectId, user);
            if (!actorRole)
                throw new Error("Unauthorized.");
            const { data: document } = yield this.client
                .from("project_document")
                .select("*")
                .eq("id", params.documentId)
                .maybeSingle();
            if (!document || document.project_id !== params.projectId) {
                throw new Error("Document not found.");
            }
            const workflowState = String((_a = document.workflow_state) !== null && _a !== void 0 ? _a : "ASSIGNED").toUpperCase();
            if (workflowState === "L1_REVIEW" || workflowState === "UNDER_L3_REVIEW" || workflowState === "APPROVED") {
                throw new Error("Document is locked and cannot be modified.");
            }
            const { error } = yield this.admin
                .from("project_document")
                .update({
                project_credit_id: params.creditId,
                doc_category: params.docCategory,
                notes: params.notes,
            })
                .eq("id", params.documentId);
            if (error)
                throw error;
            yield (0, orchestrator_1.runRuntimeTransition)(user, {
                entityType: "document",
                entityId: params.documentId,
                projectId: params.projectId,
                targetState: workflowState,
                reason: "Metadata Updated",
                metadata: { project_credit_id: params.creditId, doc_category: params.docCategory, notes: params.notes }
            });
            yield (0, activity_service_1.logDocumentActivity)(this.admin, {
                documentId: params.documentId,
                projectId: params.projectId,
                action: "metadata_updated",
                actorId: user.id,
                actorRole,
                summary: "Updated document mapping details.",
            });
            yield event_bus_1.eventBus.emit({
                type: "DOCUMENT_METADATA_UPDATED",
                payload: {
                    documentId: params.documentId,
                    projectId: params.projectId,
                    userId: user.id,
                }
            });
        });
    }
    deleteDocument(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const actorRole = yield this.getActorProjectRole(params.projectId, user);
            if (!actorRole)
                throw new Error("Unauthorized.");
            const { data: document } = yield this.client
                .from("project_document")
                .select("*")
                .eq("id", params.documentId)
                .maybeSingle();
            if (!document || document.project_id !== params.projectId) {
                throw new Error("Document not found.");
            }
            const workflowState = String((_a = document.workflow_state) !== null && _a !== void 0 ? _a : "ASSIGNED").toUpperCase();
            if (workflowState === "APPROVED" && !["super_user", "super_admin"].includes(actorRole)) {
                throw new Error("Approved documents can only be deleted by Super Users.");
            }
            // SECTION 11: No-Deletion Policy (Permanent preservation)
            yield (0, activity_service_1.logDocumentActivity)(this.admin, {
                documentId: params.documentId,
                projectId: params.projectId,
                action: "deleted",
                actorId: user.id,
                actorRole,
                summary: `Archived document ${document.file_name} (No-Deletion Policy).`,
            });
            const result = yield (0, orchestrator_1.runRuntimeTransition)(user, {
                entityType: "document",
                entityId: params.documentId,
                projectId: params.projectId,
                targetState: "REJECTED",
                reason: `[System] Withdrawn by ${user.email} at ${new Date().toISOString()}`,
            });
            if (!result.success)
                throw new Error(((_b = result.errors) === null || _b === void 0 ? void 0 : _b.join(", ")) || "Failed to withdraw document through orchestration.");
            const { error } = yield this.admin
                .from("project_document")
                .update({
                is_latest: false,
                notes: ((_c = document.notes) !== null && _c !== void 0 ? _c : "") + `\n[System] Withdrawn by ${user.email} at ${new Date().toISOString()}`
            })
                .eq("id", params.documentId);
            if (error)
                throw error;
            yield event_bus_1.eventBus.emit({
                type: "DOCUMENT_DELETED",
                payload: {
                    documentId: params.documentId,
                    projectId: params.projectId,
                    userId: user.id,
                    fileName: document.file_name,
                }
            });
        });
    }
    resubmitDocument(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const actorRole = yield this.getActorProjectRole(params.projectId, user);
            if (!actorRole)
                throw new Error("Unauthorized.");
            const { data: document } = yield this.client
                .from("project_document")
                .select("id, project_id, project_credit_id, doc_category, workflow_state, file_name, notes, state")
                .eq("id", params.documentId)
                .maybeSingle();
            if (!document || document.project_id !== params.projectId || document.state !== "CLARIFICATION") {
                throw new Error("Document cannot be resubmitted at this stage.");
            }
            const result = yield workflow_orchestrator_service_1.workflowOrchestratorService.transition(user, {
                entityType: "document",
                entityId: params.documentId,
                projectId: params.projectId,
                targetState: "UNDER_L3_REVIEW",
                action: "submit",
                reason: params.resubmitNote,
                metadata: {
                    manualSubmit: true,
                    updatedEvidence: true,
                },
                idempotencyKey: params.idempotencyKey,
            });
            if (!result.ok)
                throw new Error(result.message);
            const nextNotes = [(_a = document.notes) !== null && _a !== void 0 ? _a : "", params.resubmitNote ? `Resubmission note: ${params.resubmitNote}` : ""].filter(Boolean).join("\n\n");
            yield this.admin.from("project_document").update({ notes: nextNotes }).eq("id", params.documentId);
        });
    }
}
exports.DocumentService = DocumentService;
exports.documentService = new DocumentService();
