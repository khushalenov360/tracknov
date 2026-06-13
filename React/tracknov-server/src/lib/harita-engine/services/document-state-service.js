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
exports.toCanonicalReviewState = toCanonicalReviewState;
exports.fromCanonicalReviewState = fromCanonicalReviewState;
exports.transitionDocumentState = transitionDocumentState;
const rbac_1 = require("@/lib/rbac");
const event_bus_1 = require("@/lib/core/events/event-bus");
const notification_service_1 = require("./notification-service");
const task_service_1 = require("./task-service");
const runtime_governance_service_1 = require("./runtime-governance-service");
function toCanonicalReviewState(state) {
    switch (state) {
        case "ASSIGNED":
        case "IN_PROGRESS":
        case "MAPPED":
            return "uploaded";
        case "L1_REVIEW":
            return "owner_review";
        case "READY_FOR_L3":
        case "UNDER_L3_REVIEW":
        case "CLARIFICATION":
        case "RESUBMITTED":
            return "admin_review";
        case "APPROVED":
            return "approved";
        case "REJECTED":
        case "L1_REJECTED":
        case "REVOKED":
            return "rejected";
        default:
            return "uploaded";
    }
}
function fromCanonicalReviewState(state) {
    switch (state) {
        case "uploaded":
            return "IN_PROGRESS";
        case "owner_review":
            return "L1_REVIEW";
        case "admin_review":
            return "UNDER_L3_REVIEW";
        case "approved":
            return "APPROVED";
        case "rejected":
            return "REJECTED";
        default:
            return "IN_PROGRESS";
    }
}
const allowedTransitions = {
    ASSIGNED: ["IN_PROGRESS"],
    IN_PROGRESS: ["MAPPED"],
    MAPPED: ["L1_REVIEW"],
    L1_REVIEW: ["READY_FOR_L3", "L1_REJECTED", "REJECTED", "UNDER_L3_REVIEW", "CLARIFICATION"],
    L1_REJECTED: ["IN_PROGRESS"],
    READY_FOR_L3: ["UNDER_L3_REVIEW"],
    UNDER_L3_REVIEW: ["APPROVED", "CLARIFICATION", "REJECTED"],
    CLARIFICATION: ["RESUBMITTED", "IN_PROGRESS"],
    RESUBMITTED: ["UNDER_L3_REVIEW"],
    APPROVED: ["REVOKED"],
    REJECTED: ["IN_PROGRESS"],
    REVOKED: ["ASSIGNED"],
};
// Consistently using consolidated utility services.
// --- Logic ---
function hasReviewerAssigned(writer, projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield writer
            .from("project_users")
            .select("id")
            .eq("project_id", projectId)
            .in("role", ["owner", "project_admin", "super_admin", "super_user"])
            .limit(1);
        return Boolean(data === null || data === void 0 ? void 0 : data.length);
    });
}
function hasAllRequiredDocsForCredit(writer, creditId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { data: credit } = yield writer
            .from("project_credits")
            .select("credit_template_id")
            .eq("id", creditId)
            .maybeSingle();
        if (!(credit === null || credit === void 0 ? void 0 : credit.credit_template_id))
            return true;
        const { data: template } = yield writer
            .from("credit_template")
            .select("documents_required")
            .eq("id", credit.credit_template_id)
            .maybeSingle();
        const requirements = ((_a = template === null || template === void 0 ? void 0 : template.documents_required) !== null && _a !== void 0 ? _a : []).filter((entry) => Boolean(entry.type) && Boolean(entry.required));
        if (!requirements.length) {
            return true;
        }
        const requiredTypes = new Set(requirements.map((entry) => String(entry.type)));
        const { data: docs } = yield writer
            .from("project_document")
            .select("doc_category")
            .eq("project_credit_id", creditId)
            .in("state", ["MAPPED", "L1_REVIEW", "READY_FOR_L3", "UNDER_L3_REVIEW", "RESUBMITTED", "APPROVED"]);
        const presentTypes = new Set((docs !== null && docs !== void 0 ? docs : []).map((item) => item.doc_category));
        for (const type of requiredTypes) {
            if (!presentTypes.has(type)) {
                return false;
            }
        }
        return true;
    });
}
function getAssignedOwnerForCredit(writer, projectCreditId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield writer
            .from("project_credits")
            .select("assigned_user_id")
            .eq("id", projectCreditId)
            .maybeSingle();
        const assignedUserId = data === null || data === void 0 ? void 0 : data.assigned_user_id;
        return assignedUserId !== null && assignedUserId !== void 0 ? assignedUserId : null;
    });
}
function executeValidationGate(writer, submittalId, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const started = Date.now();
        const { data, error } = yield writer.rpc("validate_submittal", {
            p_submittal_id: submittalId,
            p_actor_id: userId !== null && userId !== void 0 ? userId : null,
        });
        if (error) {
            if (String((_a = error.message) !== null && _a !== void 0 ? _a : "").toLowerCase().includes("validate_submittal")) {
                return { ok: true };
            }
            return { ok: false, error: error.message };
        }
        const payload = (data !== null && data !== void 0 ? data : {});
        if (payload.ok === false) {
            return { ok: false, error: (_b = payload.message) !== null && _b !== void 0 ? _b : "Validation gate blocked this transition." };
        }
        void runtime_governance_service_1.runtimeGovernanceService.recordMetric({
            metricName: "validation_latency_ms",
            metricValue: Date.now() - started,
            ok: true,
            details: { submittalId },
        });
        if (Date.now() - started > 2000) {
            void runtime_governance_service_1.runtimeGovernanceService.raiseAlert({
                alertType: "validation_latency_slo_breach",
                severity: "warning",
                message: "Validation latency exceeded 2 second target.",
                context: { submittalId, latencyMs: Date.now() - started },
            });
        }
        return { ok: true };
    });
}
function recordDocumentReviewEventDirect(writer, input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        yield writer.from("document_reviews").insert({
            document_id: input.documentId,
            project_id: input.projectId,
            reviewer_id: (_a = input.reviewerId) !== null && _a !== void 0 ? _a : null,
            reviewer_role: (_b = input.reviewerRole) !== null && _b !== void 0 ? _b : null,
            action: input.action,
            status_after: input.statusAfter,
            remarks: (_c = input.remarks) !== null && _c !== void 0 ? _c : null,
            version_number: (_d = input.versionNumber) !== null && _d !== void 0 ? _d : null,
        });
    });
}
function transitionDocumentState(writer_1, _a) {
    return __awaiter(this, arguments, void 0, function* (writer, { documentId, newState, userId, actorRole, idempotencyKey, manualSubmit = false, updatedEvidence = false, remarks = null, override = false, overrideReason = null, }) {
        var _b, _c, _d;
        const transitionStarted = Date.now();
        const { data: document } = yield writer
            .from("project_document")
            .select("id, project_id, project_credit_id, credit_id, submittal_id, state, file_name, rejection_reason, rejection_count, version")
            .eq("id", documentId)
            .maybeSingle();
        if (!document) {
            yield runtime_governance_service_1.runtimeGovernanceService.recordMetric({
                metricName: "transition_latency_ms",
                metricValue: Date.now() - transitionStarted,
                ok: false,
                details: { documentId, reason: "document_not_found" },
            });
            return { ok: false, error: "Document not found." };
        }
        const currentState = ((_b = document.state) !== null && _b !== void 0 ? _b : "DRAFT");
        if (currentState === newState) {
            return {
                ok: true,
                fromState: currentState,
                toState: newState,
                projectId: document.project_id,
                creditId: document.credit_id,
            };
        }
        const isOverride = Boolean(override);
        const normalizedOverrideReason = (overrideReason === null || overrideReason === void 0 ? void 0 : overrideReason.trim()) || null;
        // Role check
        const role = String(actorRole);
        const l0Roles = ["consultant", "architect", "mep", "contractor"];
        const l1Roles = ["owner"];
        const l2Roles = ["client", "l2_reserved"];
        const l3Roles = ["project_admin", "super_admin"];
        const l5Roles = ["super_user"];
        const canStatusEditAtAnyStage = (0, rbac_1.canEditDocumentStatusAtAnyStage)(role);
        // 1. Validate transition
        const nextAllowed = (_c = allowedTransitions[currentState]) !== null && _c !== void 0 ? _c : [];
        const isAllowed = nextAllowed.includes(newState) || canStatusEditAtAnyStage || isOverride;
        if (!isAllowed && currentState !== newState) {
            yield runtime_governance_service_1.runtimeGovernanceService.raiseAlert({
                projectId: document.project_id,
                alertType: "workflow_bypass_attempt",
                severity: "critical",
                message: `Invalid transition blocked: ${currentState} -> ${newState}`,
                context: { documentId, actorRole },
            });
            return {
                ok: false,
                error: `Invalid state transition ${currentState} -> ${newState}.`,
            };
        }
        if (isOverride) {
            const canOverride = ["super_user", "super_admin", "project_admin"].includes(role);
            if (!canOverride) {
                return { ok: false, error: "Override is allowed only for admin roles." };
            }
            if (!normalizedOverrideReason) {
                return { ok: false, error: "Override reason is mandatory." };
            }
        }
        if (!isOverride && l2Roles.includes(role) && newState !== currentState) {
            return { ok: false, error: "L2 role is read-only and cannot change workflow state." };
        }
        if (!isOverride && l0Roles.includes(role) && !["IN_PROGRESS", "MAPPED"].includes(newState)) {
            return { ok: false, error: "L0 role is restricted to upload and mapping transitions only." };
        }
        if (!isOverride && l1Roles.includes(role) && !["L1_REVIEW", "READY_FOR_L3", "L1_REJECTED", "REJECTED", "UNDER_L3_REVIEW", "CLARIFICATION"].includes(newState)) {
            return { ok: false, error: "L1 role can only perform owner-stage review actions." };
        }
        if (!isOverride && ["APPROVED", "REJECTED", "CLARIFICATION"].includes(newState) && !(l3Roles.includes(role) || l5Roles.includes(role))) {
            if (newState === "APPROVED") {
                yield runtime_governance_service_1.runtimeGovernanceService.raiseAlert({
                    projectId: document.project_id,
                    alertType: "authorization_failure",
                    severity: "warning",
                    message: "Unauthorized approval attempt blocked.",
                    context: { documentId, actorRole, targetState: newState },
                });
                return { ok: false, error: "Only L3 roles can approve documents." };
            }
        }
        if (!isOverride && newState === "APPROVED" && !remarks) {
            return { ok: false, error: "Approval requires mandatory comments for audit attribution." };
        }
        if (!isOverride && newState === "L1_REVIEW" && !(l1Roles.includes(role) || l5Roles.includes(role))) {
            return { ok: false, error: "Only L1 or L5 can move document into Project Manager (PM) review." };
        }
        if (!isOverride && newState === "UNDER_L3_REVIEW" && !(l1Roles.includes(role) || l3Roles.includes(role) || l5Roles.includes(role))) {
            return { ok: false, error: "Only L3 or L5 can move document into admin review." };
        }
        // Business rules
        if (currentState === "ASSIGNED" && newState === "IN_PROGRESS") {
            // Initial upload or assignment acceptance logic here if needed
        }
        if (currentState === "IN_PROGRESS" && newState === "MAPPED") {
            const ready = yield hasAllRequiredDocsForCredit(writer, document.project_credit_id);
            if (!ready) {
                return { ok: false, error: "Cannot mark MAPPED until all required document types exist for this credit." };
            }
        }
        if (currentState === "MAPPED" && newState === "L1_REVIEW" && !manualSubmit) {
            return { ok: false, error: "MAPPED to L1_REVIEW requires manual trigger." };
        }
        if (currentState === "L1_REVIEW" && newState === "READY_FOR_L3") {
            const hasReviewer = yield hasReviewerAssigned(writer, document.project_id);
            if (!hasReviewer) {
                return { ok: false, error: "Cannot move to READY_FOR_L3 without admin reviewer assignment." };
            }
        }
        if ((currentState === "MAPPED" && newState === "L1_REVIEW") || (currentState === "READY_FOR_L3" && newState === "UNDER_L3_REVIEW")) {
            if (document.submittal_id) {
                const validationGate = yield executeValidationGate(writer, document.submittal_id, userId !== null && userId !== void 0 ? userId : null);
                if (!validationGate.ok) {
                    return { ok: false, error: validationGate.error };
                }
            }
        }
        if (currentState === "CLARIFICATION" && newState === "RESUBMITTED" && !updatedEvidence) {
            return { ok: false, error: "Cannot resubmit without updated evidence." };
        }
        // 2. Execute Atomic Transaction via RPC (Section 4: Atomic Governance Transactions)
        const { data: rpcData, error: rpcError } = yield writer.rpc("execute_governed_transition", {
            p_entity_type: "document",
            p_entity_id: documentId,
            p_target_state: newState,
            p_actor_id: userId !== null && userId !== void 0 ? userId : null,
            p_actor_role: actorRole,
            p_reason: remarks || overrideReason || "Status update",
            p_idempotency_key: idempotencyKey,
            p_metadata: {
                is_override: isOverride,
                override_reason: normalizedOverrideReason,
                manual_submit: manualSubmit,
                updated_evidence: updatedEvidence
            }
        });
        if (rpcError) {
            return { ok: false, error: rpcError.message };
        }
        const result = rpcData;
        if (!result.success) {
            return { ok: false, error: "Atomic transition failed." };
        }
        const resolvedTargetState = result.to;
        const fromState = result.from;
        // 3. Side Effects (Notifications, Scoring, Metrics) - Non-Atomic but Eventual
        // Notifications (Async/Background)
        if (resolvedTargetState === "UNDER_L3_REVIEW") {
            const admins = yield (0, notification_service_1.getProjectMembersByRoles)(writer, document.project_id, ["project_admin", "super_admin", "super_user"]);
            void (0, notification_service_1.notifyUsers)(writer, {
                projectId: document.project_id,
                creditId: document.credit_id,
                documentId,
                userIds: admins,
                body: `A document (${document.file_name}) is ready for Project Admin review.`,
                actionUrl: `/review-queue?project=${document.project_id}&document=${documentId}`,
            });
        }
        else if (resolvedTargetState === "L1_REVIEW") {
            const owners = yield (0, notification_service_1.getProjectMembersByRoles)(writer, document.project_id, ["owner"]);
            void (0, notification_service_1.notifyUsers)(writer, {
                projectId: document.project_id,
                creditId: document.credit_id,
                documentId,
                userIds: owners,
                body: `A document (${document.file_name}) is awaiting Project Manager (PM) review.`,
                actionUrl: `/review-queue?project=${document.project_id}&document=${documentId}`,
            });
        }
        else if (["CLARIFICATION", "REJECTED", "L1_REJECTED"].includes(resolvedTargetState)) {
            const assignedOwnerId = yield getAssignedOwnerForCredit(writer, document.project_credit_id);
            const { data: docData } = yield writer.from("project_document").select("uploaded_by").eq("id", documentId).maybeSingle();
            const targetUserId = assignedOwnerId || (docData === null || docData === void 0 ? void 0 : docData.uploaded_by) || null;
            if (targetUserId) {
                void (0, notification_service_1.notifyUsers)(writer, {
                    projectId: document.project_id,
                    creditId: document.credit_id,
                    documentId,
                    userIds: [targetUserId],
                    body: `Document (${document.file_name}) was sent back for clarification: ${remarks || "No reason provided."}`,
                    actionUrl: `/documents?project=${document.project_id}&document=${documentId}`,
                });
                void task_service_1.taskService.upsertClarificationTask({
                    projectId: document.project_id,
                    documentId,
                    assignedUserId: targetUserId,
                    createdBy: userId !== null && userId !== void 0 ? userId : null,
                    title: `Fix and resubmit ${document.file_name}`,
                    description: remarks || "Document needs clarification before approval.",
                });
            }
        }
        else if (resolvedTargetState === "APPROVED") {
            const { data: docData } = yield writer.from("project_document").select("uploaded_by").eq("id", documentId).maybeSingle();
            if (docData === null || docData === void 0 ? void 0 : docData.uploaded_by) {
                void (0, notification_service_1.notifyUsers)(writer, {
                    projectId: document.project_id,
                    creditId: document.credit_id,
                    documentId,
                    userIds: [docData.uploaded_by],
                    body: `Your document (${document.file_name}) has been approved.`,
                    actionUrl: `/documents?project=${document.project_id}&document=${documentId}`,
                });
            }
        }
        // Scoring update (Async)
        if (document.project_id) {
            void (() => __awaiter(this, void 0, void 0, function* () {
                const { error } = yield writer.rpc("recompute_credit_scores", { p_project_id: document.project_id });
                if (error) {
                    // Silently fail recompute to not interrupt main flow
                }
            }))();
            void (() => __awaiter(this, void 0, void 0, function* () {
                const { error } = yield writer.rpc("recompute_project_health_status", { p_project_id: document.project_id });
                if (error) {
                    // Silently fail recompute to not interrupt main flow
                }
            }))();
        }
        event_bus_1.eventBus.emit({
            type: "REVIEW_COMPLETED",
            payload: {
                documentId,
                projectId: document.project_id,
                status: resolvedTargetState,
                userId: userId || "",
            },
        });
        const transitionLatency = Date.now() - transitionStarted;
        void runtime_governance_service_1.runtimeGovernanceService.recordMetric({
            projectId: (_d = document.project_id) !== null && _d !== void 0 ? _d : null,
            metricName: "transition_latency_ms",
            metricValue: transitionLatency,
            ok: true,
            details: { documentId, fromState, toState: resolvedTargetState, idempotent: result.idempotent },
        });
        return {
            ok: true,
            fromState,
            toState: resolvedTargetState,
            projectId: document.project_id,
            creditId: document.credit_id,
        };
    });
}
