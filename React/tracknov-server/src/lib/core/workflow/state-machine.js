"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCanonicalState = toCanonicalState;
exports.canTransitionDocument = canTransitionDocument;
exports.getTransitionSideEffects = getTransitionSideEffects;
exports.getTransitionPayload = getTransitionPayload;
function toCanonicalState(status) {
    if (status === "owner_approved") {
        return "admin_review";
    }
    if (status === "approved") {
        return "approved";
    }
    if (status === "rejected") {
        return "rejected";
    }
    return "uploaded";
}
const allowedTransitions = {
    uploaded: ["owner_review", "admin_review", "rejected"],
    owner_review: ["admin_review", "rejected"],
    admin_review: ["approved", "rejected"],
    approved: [],
    rejected: ["uploaded"],
};
function canTransitionDocument(params) {
    var _a;
    const { fromStatus, toStatus, actorRole, allowOverride } = params;
    if (allowOverride) {
        return true;
    }
    const from = toCanonicalState(fromStatus);
    const to = toCanonicalState(toStatus);
    const allowed = (_a = allowedTransitions[from]) !== null && _a !== void 0 ? _a : [];
    if (!allowed.includes(to)) {
        return false;
    }
    const role = String(actorRole);
    const isOwner = role === "owner" || role === "super_user";
    const isAdmin = role === "project_admin" || role === "super_admin" || role === "super_user";
    if (toStatus === "owner_approved") {
        return isOwner && fromStatus === "uploaded";
    }
    if (toStatus === "approved") {
        return isAdmin && fromStatus === "owner_approved";
    }
    if (toStatus === "rejected") {
        return (isOwner && fromStatus === "uploaded") || (isAdmin && fromStatus === "owner_approved");
    }
    if (toStatus === "uploaded") {
        return fromStatus === "rejected";
    }
    return false;
}
function getTransitionSideEffects(toStatus, isOwner, isAdmin, isOverride) {
    if (isOverride && !["owner_approved", "approved", "rejected"].includes(toStatus)) {
        return {
            logSummary: "Updated review status.",
            reviewEventAction: "status_override",
        };
    }
    switch (toStatus) {
        case "owner_approved":
            return {
                logSummary: "Moved document to Project Admin review.",
                reviewEventAction: "owner_forward",
                notificationType: "admin_review_ready"
            };
        case "approved":
            return {
                logSummary: "Approved document for submission pack.",
                reviewEventAction: "admin_approve",
                notificationType: "uploader_approved"
            };
        case "rejected":
            return {
                logSummary: "Rejected document with review note.",
                reviewEventAction: isOwner && !isAdmin ? "owner_reject" : "admin_reject",
                notificationType: "uploader_rejected",
                requiresRemark: true
            };
        default:
            return {
                logSummary: "Updated review status.",
                reviewEventAction: "status_override"
            };
    }
}
function getTransitionPayload(toStatus, actorId, isOwner, isAdmin, rejectionRemark) {
    const now = new Date().toISOString();
    let payload = {
        status: toStatus,
        rejection_reason: toStatus === "rejected" ? rejectionRemark || "" : "",
    };
    if (toStatus === "owner_approved") {
        payload.owner_reviewed_by = actorId;
        payload.owner_reviewed_at = now;
    }
    else if (toStatus === "approved") {
        payload.reviewed_by = actorId;
        payload.reviewed_at = now;
    }
    else if (toStatus === "rejected") {
        if (isOwner && !isAdmin) {
            payload.owner_reviewed_by = actorId;
            payload.owner_reviewed_at = now;
        }
        else if (isAdmin) {
            payload.reviewed_by = actorId;
            payload.reviewed_at = now;
        }
    }
    else if (toStatus === "uploaded") {
        payload.owner_reviewed_by = null;
        payload.owner_reviewed_at = null;
        payload.reviewed_by = null;
        payload.reviewed_at = null;
    }
    return payload;
}
