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
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordDocumentReviewEvent = exports.reviewService = exports.ReviewService = exports.rejectionTemplateLibrary = void 0;
const admin_1 = require("@/lib/supabase/admin");
const server_1 = require("@/lib/supabase/server");
const env_1 = require("@/lib/env");
const workflow_orchestrator_service_1 = require("./workflow-orchestrator-service");
const rag_service_1 = require("./rag-service");
const event_bus_1 = require("@/lib/core/events/event-bus");
const igbc_scoring_service_1 = require("./igbc-scoring-service");
const data_1 = require("@/lib/data");
exports.rejectionTemplateLibrary = {
    missing_data: "Missing required information. Please resubmit with all mandatory values clearly visible.",
    incorrect_format: "Document format is incorrect for this requirement. Upload the required format with readable structure.",
    wrong_document: "Wrong document type for this credit. Please upload the exact required evidence for this credit slot.",
    poor_quality: "Document image/scan quality is unclear. Please upload a readable, high-clarity file.",
    outdated_document: "Document is outdated for current review cycle. Please upload the latest valid certificate/record.",
    wrong_credit_mapping: "Document is mapped to the wrong credit. Please remap and resubmit under the correct credit requirement.",
};
class ReviewService {
    get client() { return (0, server_1.createClient)(); }
    get admin() { return env_1.env.supabaseServiceRoleKey ? (0, admin_1.createAdminClient)() : this.client; }
    recordRejectionPattern(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            if (!params.creditId || !params.docCategory || !params.rejectionReason)
                return;
            const { data: existing } = yield this.admin
                .from("rejection_patterns")
                .select("id, occurrence_count")
                .eq("credit_id", params.creditId)
                .eq("doc_category", params.docCategory)
                .eq("rejection_reason", params.rejectionReason)
                .limit(1)
                .maybeSingle();
            if (existing === null || existing === void 0 ? void 0 : existing.id) {
                yield this.admin
                    .from("rejection_patterns")
                    .update({
                    occurrence_count: Number((_a = existing.occurrence_count) !== null && _a !== void 0 ? _a : 0) + 1,
                    suggested_fix: (_b = params.suggestedFix) !== null && _b !== void 0 ? _b : null,
                    metadata: (_c = params.metadata) !== null && _c !== void 0 ? _c : {},
                    updated_at: new Date().toISOString(),
                })
                    .eq("id", existing.id);
                return;
            }
            yield this.admin.from("rejection_patterns").insert({
                credit_id: params.creditId,
                doc_category: params.docCategory,
                rejection_reason: params.rejectionReason,
                suggested_fix: (_d = params.suggestedFix) !== null && _d !== void 0 ? _d : null,
                occurrence_count: 1,
                metadata: (_e = params.metadata) !== null && _e !== void 0 ? _e : {},
            });
        });
    }
    recordDocumentReviewEvent(input) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            yield this.admin.from("document_reviews").insert({
                document_id: input.documentId,
                project_id: input.projectId,
                reviewer_id: (_a = input.reviewerId) !== null && _a !== void 0 ? _a : null,
                reviewer_role: (_b = input.reviewerRole) !== null && _b !== void 0 ? _b : null,
                action: input.action,
                status_after: input.statusAfter,
                remarks: (_c = input.remarks) !== null && _c !== void 0 ? _c : null,
            });
        });
    }
    addRemark(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { error } = yield this.admin.from("remarks").insert({
                credit_id: params.creditId,
                author_id: user.id,
                role: params.role,
                body: params.body,
            });
            if (error)
                throw error;
        });
    }
    transitionDocument(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            const actorRole = yield this.getActorProjectRole(params.projectId, user);
            if (!actorRole)
                throw new Error("Unauthorized.");
            const { data: targetDocument } = yield this.client
                .from("project_document")
                .select("id, project_credit_id, doc_category, state")
                .eq("id", params.documentId)
                .maybeSingle();
            const result = yield workflow_orchestrator_service_1.workflowOrchestratorService.transition(user, {
                entityType: "document",
                entityId: params.documentId,
                projectId: params.projectId,
                targetState: params.newState,
                action: params.manualSubmit ? "submit" : null,
                reason: (_a = params.remarks) !== null && _a !== void 0 ? _a : null,
                metadata: {
                    manualSubmit: Boolean(params.manualSubmit),
                    updatedEvidence: Boolean(params.updatedEvidence),
                },
                idempotencyKey: (_b = params.idempotencyKey) !== null && _b !== void 0 ? _b : null,
                override: Boolean(params.override),
                overrideReason: (_c = params.overrideReason) !== null && _c !== void 0 ? _c : null,
            });
            if (!result.ok)
                throw new Error(result.message);
            if (params.newState === "APPROVED") {
                yield rag_service_1.ragService.ingestApprovedDocument(params.documentId);
            }
            // Record immutable review event
            yield this.recordDocumentReviewEvent({
                documentId: params.documentId,
                projectId: params.projectId,
                reviewerId: user.id,
                reviewerRole: actorRole,
                action: params.newState === "APPROVED" ? "admin_approve" :
                    params.newState === "UNDER_REVIEW" ? "owner_forward" :
                        params.newState === "CLARIFICATION" || params.newState === "REJECTED" ? (actorRole === "owner" ? "owner_reject" : "admin_reject") : "status_override",
                statusAfter: params.newState,
                remarks: params.remarks,
            });
            // Emit Event
            yield event_bus_1.eventBus.emit({
                type: "REVIEW_COMPLETED",
                payload: {
                    documentId: params.documentId,
                    projectId: params.projectId,
                    status: params.newState,
                    userId: user.id,
                }
            });
            if (params.newState === "REJECTED" || params.newState === "CLARIFICATION") {
                const rejectionReason = ((_d = params.remarks) === null || _d === void 0 ? void 0 : _d.trim()) || "Rejected without explicit reason";
                const maybeTemplate = (_f = (_e = rejectionReason.match(/^\[(.+?)\]\s*/)) === null || _e === void 0 ? void 0 : _e[1]) !== null && _f !== void 0 ? _f : null;
                const suggestedFix = maybeTemplate && exports.rejectionTemplateLibrary[maybeTemplate]
                    ? exports.rejectionTemplateLibrary[maybeTemplate]
                    : null;
                yield this.recordRejectionPattern({
                    creditId: (_g = targetDocument === null || targetDocument === void 0 ? void 0 : targetDocument.project_credit_id) !== null && _g !== void 0 ? _g : null,
                    docCategory: (_h = targetDocument === null || targetDocument === void 0 ? void 0 : targetDocument.doc_category) !== null && _h !== void 0 ? _h : null,
                    rejectionReason,
                    suggestedFix,
                    metadata: {
                        from_state: (_j = targetDocument === null || targetDocument === void 0 ? void 0 : targetDocument.state) !== null && _j !== void 0 ? _j : null,
                        rejected_by_role: actorRole,
                    },
                });
                yield event_bus_1.eventBus.emit({
                    type: "DOCUMENT_REJECTED",
                    payload: {
                        documentId: params.documentId,
                        projectId: params.projectId,
                        userId: user.id,
                        reason: params.remarks || "No reason provided",
                    }
                });
            }
            return result;
        });
    }
    transitionSubmittal(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const result = yield workflow_orchestrator_service_1.workflowOrchestratorService.transition(user, {
                entityType: "submittal",
                entityId: params.submittalId,
                projectId: params.projectId,
                targetState: params.newState,
                reason: (_a = params.remarks) !== null && _a !== void 0 ? _a : null,
            });
            if (!result.ok)
                throw new Error(result.message);
            return { ok: true, workflow_state: result.workflow_state };
        });
    }
    canSubmitProject(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const workspace = yield (0, data_1.getProjectWorkspace)(projectId);
            if (!workspace)
                throw new Error("Project not found.");
            const score = (0, igbc_scoring_service_1.computeIgbcScore)(workspace);
            return {
                canSubmit: score.mandatory.complete,
                missingMandatory: score.mandatory.total - score.mandatory.approved,
                scorePct: score.overall.scorePct,
                projectedRating: score.overall.projectedRating
            };
        });
    }
    submitProject(user, projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { canSubmit, missingMandatory } = yield this.canSubmitProject(projectId);
            if (!canSubmit) {
                throw new Error(`Cannot submit: ${missingMandatory} mandatory credits are not approved.`);
            }
            const actorRole = yield this.getActorProjectRole(projectId, user);
            if (!actorRole)
                throw new Error("Unauthorized.");
            const idempotencyKey = `project-${projectId}-SUBMITTED-${Date.now()}`;
            const { error: transitionError } = yield this.admin.rpc("execute_governed_transition", {
                p_entity_type: "project",
                p_entity_id: projectId,
                p_target_state: "SUBMITTED",
                p_actor_id: user.id,
                p_actor_role: actorRole,
                p_reason: "Project submitted for certification",
                p_idempotency_key: idempotencyKey,
                p_metadata: {},
            });
            if (transitionError)
                throw transitionError;
            yield event_bus_1.eventBus.emit({
                type: "REVIEW_COMPLETED",
                payload: {
                    documentId: "",
                    projectId,
                    status: "SUBMITTED_FOR_CERTIFICATION",
                    userId: user.id,
                }
            });
            return { ok: true };
        });
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
}
exports.ReviewService = ReviewService;
exports.reviewService = new ReviewService();
const recordDocumentReviewEvent = (input) => exports.reviewService.recordDocumentReviewEvent(input);
exports.recordDocumentReviewEvent = recordDocumentReviewEvent;
