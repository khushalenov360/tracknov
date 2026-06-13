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
exports.creditService = exports.CreditService = void 0;
const server_1 = require("@/lib/supabase/server");
const admin_1 = require("@/lib/supabase/admin");
const env_1 = require("@/lib/env");
const activity_service_1 = require("./activity-service");
const task_service_1 = require("./task-service");
const rbac_1 = require("@/lib/rbac");
const governanceMutationInterceptor_1 = require("@/lib/harita-engine/governance/governanceMutationInterceptor");
const orchestrator_1 = require("@/core/runtime/orchestrator");
class CreditService {
    get client() { return (0, server_1.createClient)(); }
    get admin() { return env_1.env.supabaseServiceRoleKey ? (0, admin_1.createAdminClient)() : this.client; }
    setCreditState(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const actorRole = user.role;
            // Auth Check
            if (!(0, rbac_1.canUser)(actorRole, "APPROVE", "CREDIT")) {
                throw new Error("Unauthorized: Insufficient role level for credit state transition.");
            }
            if (params.state === "APPROVED") {
                const { data: docs } = yield this.admin
                    .from("project_document")
                    .select("workflow_state")
                    .eq("project_credit_id", params.creditId)
                    .eq("is_latest", true);
                const rows = docs !== null && docs !== void 0 ? docs : [];
                const hasUnapproved = rows.some((doc) => doc.workflow_state !== "APPROVED");
                if (hasUnapproved) {
                    throw new Error("Section 13 Violation: Cannot approve credit until all linked documents are APPROVED.");
                }
            }
            // SECTION 26: Intercept
            yield (0, governanceMutationInterceptor_1.interceptMutation)({
                mutationType: "CREDIT_STATE_TRANSITION",
                sourceLayer: "CreditService",
                payload: params
            });
            // Update project_credits via Orchestrator
            const result = yield (0, orchestrator_1.runRuntimeTransition)(user, {
                entityType: "credit",
                entityId: params.creditId,
                projectId: params.projectId,
                targetState: params.state,
                reason: params.remarks || "State transition",
                idempotencyKey: `credit-${params.creditId}-${Date.now()}`,
                metadata: { remarks: params.remarks || null }
            });
            if (!result.success)
                throw new Error(((_a = result.errors) === null || _a === void 0 ? void 0 : _a.join(", ")) || "Failed to update credit state.");
        });
    }
    updateRequirements(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // SECTION 26: Intercept
            yield (0, governanceMutationInterceptor_1.interceptMutation)({
                mutationType: "CREDIT_REQUIREMENTS_UPDATE",
                sourceLayer: "CreditService",
                payload: params
            });
            const { data: membership } = yield this.client
                .from("project_users")
                .select("role")
                .eq("project_id", params.projectId)
                .eq("user_id", user.id)
                .maybeSingle();
            const actorRole = (membership === null || membership === void 0 ? void 0 : membership.role) || user.role;
            if (!(0, rbac_1.canUser)(actorRole, "EDIT_CONTROLS", "PROJECT")) {
                throw new Error("Unauthorized.");
            }
            const { data: credit } = yield this.client
                .from("project_credits")
                .select("id, documents_required")
                .eq("id", params.creditId)
                .maybeSingle();
            if (!credit)
                throw new Error("Credit not found.");
            const nextRequirements = ((_a = credit.documents_required) !== null && _a !== void 0 ? _a : []).map((item) => {
                if (item.type === params.docType) {
                    return Object.assign(Object.assign({}, item), { required: params.isRequired, requirement: params.isRequired ? "Required" : "NA" });
                }
                return item;
            });
            const { error } = yield this.admin
                .from("project_credits")
                .update({ documents_required: nextRequirements })
                .eq("id", params.creditId);
            if (error)
                throw error;
            yield (0, activity_service_1.logSystemActivity)(this.admin, {
                projectId: params.projectId,
                entityType: "credit",
                entityId: params.creditId,
                action: "requirements_updated",
                actorId: user.id,
                actorRole,
                summary: "Updated required document type for credit.",
                details: { docType: params.docType, isRequired: params.isRequired },
            });
        });
    }
    assignContributor(user, params, externalWriter) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const writer = externalWriter || this.admin;
            const documentType = params.documentType || null;
            const now = new Date().toISOString();
            // SECTION 26: Intercept
            yield (0, governanceMutationInterceptor_1.interceptMutation)({
                mutationType: "CREDIT_ASSIGNMENT",
                sourceLayer: "CreditService",
                payload: params
            });
            const { data: membership } = yield this.client
                .from("project_users")
                .select("role")
                .eq("project_id", params.projectId)
                .eq("user_id", user.id)
                .maybeSingle();
            const actorRole = (membership === null || membership === void 0 ? void 0 : membership.role) || user.role;
            if (!(0, rbac_1.canUser)(actorRole, "MANAGE_TEAM", "TEAM")) {
                throw new Error("Unauthorized: Insufficient role level for management.");
            }
            // Stage 1: Parallelize initial updates & member checks
            const initialPromises = [];
            if (params.assignedUserId) {
                initialPromises.push(writer
                    .from("project_credits")
                    .update({
                    assigned_user_id: params.assignedUserId,
                    updated_at: now,
                })
                    .eq("id", params.projectCreditId)
                    .eq("project_id", params.projectId)
                    .then(({ error }) => { if (error)
                    throw error; }));
            }
            let assignmentUpdate = writer
                .from("assignments")
                .update({ is_active: false, updated_at: now })
                .eq("project_id", params.projectId)
                .eq("project_credit_id", params.projectCreditId)
                .eq("is_active", true);
            assignmentUpdate = documentType
                ? assignmentUpdate.eq("document_type", documentType)
                : assignmentUpdate.is("document_type", null);
            initialPromises.push(assignmentUpdate.then(({ error }) => { if (error)
                throw error; }));
            let targetMemberPromise = Promise.resolve({ data: null });
            if (params.assignedUserId) {
                targetMemberPromise = Promise.resolve(this.client
                    .from("project_users")
                    .select("role")
                    .eq("project_id", params.projectId)
                    .eq("user_id", params.assignedUserId)
                    .maybeSingle());
            }
            const [, , memberRes] = yield Promise.all([
                ...initialPromises,
                targetMemberPromise
            ]);
            const targetMember = memberRes === null || memberRes === void 0 ? void 0 : memberRes.data;
            // Stage 2: Parallelize insertions and state transitions
            if (params.assignedUserId) {
                const postInsertPromises = [];
                postInsertPromises.push(writer
                    .from("assignments")
                    .insert({
                    project_id: params.projectId,
                    project_credit_id: params.projectCreditId,
                    document_type: documentType,
                    user_id: params.assignedUserId,
                    role: (_a = targetMember === null || targetMember === void 0 ? void 0 : targetMember.role) !== null && _a !== void 0 ? _a : "L0",
                    is_active: true,
                    created_by: user.id,
                })
                    .then(({ error }) => { if (error)
                    throw error; }));
                const docTypeMsg = documentType ? ` for ${documentType}` : "";
                postInsertPromises.push(writer.from("notification_outbox").insert({
                    project_id: params.projectId,
                    user_id: params.assignedUserId,
                    event_type: "ASSIGNMENT",
                    message: `You have been assigned to provide evidence${docTypeMsg}.`,
                    metadata: {
                        project_credit_id: params.projectCreditId
                    }
                }).then(({ error }) => { if (error)
                    throw error; }));
                postInsertPromises.push(writer.from("project_credits")
                    .update({ state: "IN_PROGRESS" })
                    .eq("id", params.projectCreditId)
                    .neq("state", "COMPLETE")
                    .then(({ error }) => { if (error)
                    throw error; }));
                yield Promise.all(postInsertPromises);
            }
            // Stage 3: Rekey recalculations, tasks, and system logs in parallel
            const finalPromises = [];
            finalPromises.push(writer.rpc("recalculate_derived_states", {
                p_project_id: params.projectId,
                p_project_credit_id: params.projectCreditId,
            }).then(({ error }) => { if (error)
                throw error; }));
            if (params.assignedUserId) {
                finalPromises.push(task_service_1.taskService.upsertAssignmentUploadTask({
                    projectId: params.projectId,
                    projectCreditId: params.projectCreditId,
                    assignedUserId: params.assignedUserId,
                    createdBy: user.id,
                    priority: "HIGH",
                    docType: documentType || undefined,
                }));
            }
            else {
                finalPromises.push(task_service_1.taskService.closeAssignmentTasks({
                    projectId: params.projectId,
                    projectCreditId: params.projectCreditId,
                }));
            }
            finalPromises.push((0, activity_service_1.logSystemActivity)(writer, {
                projectId: params.projectId,
                entityType: "credit",
                entityId: params.projectCreditId,
                action: "credit_assignee_updated",
                actorId: user.id,
                actorRole,
                summary: params.assignedUserId ? "Assigned owner to credit document requirement." : "Cleared credit document requirement assignment.",
                details: { assigned_user_id: params.assignedUserId, document_type: documentType },
            }));
            yield Promise.all(finalPromises);
        });
    }
    updateGuidance(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            // SECTION 26: Intercept
            yield (0, governanceMutationInterceptor_1.interceptMutation)({
                mutationType: "CREDIT_GUIDANCE_UPDATE",
                sourceLayer: "CreditService",
                payload: params
            });
            const actorRole = user.role;
            if (!(0, rbac_1.canUser)(actorRole, "EDIT_CONTROLS", "PROJECT")) {
                throw new Error("Unauthorized.");
            }
            const { error } = yield this.admin
                .from("project_credits")
                .update({
                what_to_submit: params.whatToSubmit,
                sample_document_url: params.sampleDocumentUrl,
                effort_level: params.effortLevel,
                effort_guidance: params.effortGuidance,
            })
                .eq("id", params.creditId);
            if (error)
                throw error;
        });
    }
}
exports.CreditService = CreditService;
exports.creditService = new CreditService();
