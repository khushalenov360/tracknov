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
exports.notifyUsers = notifyUsers;
exports.getProjectMembersByRoles = getProjectMembersByRoles;
exports.logDocumentActivity = logDocumentActivity;
exports.executeDocumentTransition = executeDocumentTransition;
const review_service_1 = require("@/lib/harita-engine/services/review-service");
const rbac_1 = require("@/lib/rbac");
const state_machine_1 = require("@/lib/core/workflow/state-machine");
function notifyUsers(writer_1, _a) {
    return __awaiter(this, arguments, void 0, function* (writer, { projectId, creditId, documentId, userIds, body, }) {
        const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
        if (!uniqueUserIds.length || !body.trim()) {
            return;
        }
        yield writer.from("notifications").insert(uniqueUserIds.map((userId) => ({
            project_id: projectId,
            credit_id: creditId !== null && creditId !== void 0 ? creditId : null,
            document_id: documentId !== null && documentId !== void 0 ? documentId : null,
            user_id: userId,
            body,
        })));
    });
}
function getProjectMembersByRoles(writer, projectId, roles) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield writer
            .from("project_members")
            .select("user_id")
            .eq("project_id", projectId)
            .in("role", roles);
        return (data !== null && data !== void 0 ? data : []).map((row) => row.user_id).filter(Boolean);
    });
}
function logDocumentActivity(writer_1, _a) {
    return __awaiter(this, arguments, void 0, function* (writer, { documentId, projectId, action, actorId, actorRole, summary, details = {}, }) {
        yield writer.from("document_activity_logs").insert({
            document_id: documentId !== null && documentId !== void 0 ? documentId : null,
            project_id: projectId,
            action,
            actor_id: actorId !== null && actorId !== void 0 ? actorId : null,
            actor_role: actorRole !== null && actorRole !== void 0 ? actorRole : null,
            summary,
            details,
        });
    });
}
function executeDocumentTransition(params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { writer, client, documentId, projectId, creditId, currentStatus, targetStatus, actorId, actorRole, rejectionRemark, rejectionType, } = params;
        const role = String(actorRole);
        const isOwner = role === "owner" || role === "super_user";
        const isAdmin = role === "project_admin" || role === "super_admin" || role === "super_user";
        const canStatusEditAtAnyStage = (0, rbac_1.canEditDocumentStatusAtAnyStage)(role);
        // 1. Validation
        const transitionAllowed = (0, state_machine_1.canTransitionDocument)({
            fromStatus: currentStatus,
            toStatus: targetStatus,
            actorRole,
            allowOverride: canStatusEditAtAnyStage,
        });
        if (!transitionAllowed) {
            return { error: "Invalid state transition" };
        }
        // 2. Format remarks
        const formattedRemark = rejectionType && rejectionRemark
            ? `[${rejectionType}] ${rejectionRemark}`
            : rejectionRemark || "";
        // 3. Database Update Payload
        const payload = (0, state_machine_1.getTransitionPayload)(targetStatus, actorId, isOwner, isAdmin, formattedRemark);
        const { error: updateError } = yield writer
            .from("documents")
            .update(payload)
            .eq("id", documentId);
        if (updateError) {
            return { error: updateError.message };
        }
        // 4. Determine Side Effects
        const isOverride = canStatusEditAtAnyStage && !(0, state_machine_1.canTransitionDocument)({
            fromStatus: currentStatus,
            toStatus: targetStatus,
            actorRole,
            allowOverride: false,
        });
        const sideEffects = (0, state_machine_1.getTransitionSideEffects)(targetStatus, isOwner, isAdmin, isOverride);
        // Log Activity
        yield logDocumentActivity(writer, {
            documentId,
            projectId,
            action: "status_updated",
            actorId,
            actorRole,
            summary: sideEffects.logSummary,
            details: Object.assign({ from_status: currentStatus, to_status: targetStatus }, (sideEffects.requiresRemark ? { rejection_type: rejectionType || null, rejection_remark: formattedRemark } : {})),
        });
        // Remediation 04: Approved Document Set Authority
        if (targetStatus === "approved") {
            // 1. Get or Create Active Set
            const { data: activeSet } = yield writer.from("approved_document_sets").select("id").eq("project_id", projectId).eq("status", "ACTIVE").maybeSingle();
            let setId = activeSet === null || activeSet === void 0 ? void 0 : activeSet.id;
            if (!setId) {
                const { data: newSet } = yield writer.from("approved_document_sets").insert({ project_id: projectId, status: "ACTIVE" }).select("id").single();
                setId = newSet === null || newSet === void 0 ? void 0 : newSet.id;
            }
            if (setId) {
                yield writer.from("approved_document_set_items").upsert({
                    set_id: setId,
                    document_id: documentId,
                    project_credit_id: creditId,
                }, { onConflict: "set_id,document_id" });
            }
        }
        else if (currentStatus === "approved") {
            // If transitioning OUT of approved (e.g. revoked), remove it
            yield writer.from("approved_document_set_items").delete().eq("document_id", documentId);
        }
        // Record Review Event
        yield (0, review_service_1.recordDocumentReviewEvent)({
            documentId,
            projectId,
            reviewerId: actorId,
            reviewerRole: actorRole,
            action: sideEffects.reviewEventAction,
            statusAfter: targetStatus,
            remarks: sideEffects.requiresRemark ? formattedRemark : null,
        });
        // Insert Remarks if needed
        if (sideEffects.requiresRemark && formattedRemark) {
            yield client.from("remarks").insert({
                credit_id: creditId,
                document_id: documentId,
                author_id: actorId,
                role: actorRole,
                body: formattedRemark,
            });
        }
        // Dispatch Notifications
        if (sideEffects.notificationType) {
            if (sideEffects.notificationType === "admin_review_ready") {
                const projectAdminIds = yield getProjectMembersByRoles(writer, projectId, ["project_admin", "super_admin"]);
                yield notifyUsers(writer, {
                    projectId,
                    creditId,
                    documentId,
                    userIds: projectAdminIds,
                    body: "A document is ready for Project Admin review.",
                });
            }
            else if (sideEffects.notificationType === "uploader_approved" || sideEffects.notificationType === "uploader_rejected") {
                const uploaderRecord = yield client
                    .from("documents")
                    .select("uploaded_by")
                    .eq("id", documentId)
                    .maybeSingle();
                const uploaderId = (_a = uploaderRecord.data) === null || _a === void 0 ? void 0 : _a.uploaded_by;
                if (uploaderId) {
                    const body = sideEffects.notificationType === "uploader_approved"
                        ? "Your document was approved for submission pack inclusion."
                        : `Document sent back: ${formattedRemark}`;
                    yield notifyUsers(writer, {
                        projectId,
                        creditId,
                        documentId,
                        userIds: [uploaderId],
                        body,
                    });
                }
            }
        }
        return { success: true };
    });
}
