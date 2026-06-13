"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toLegacyCreditStatus = toLegacyCreditStatus;
exports.resolveTrackerCellStatus = resolveTrackerCellStatus;
const constants_1 = require("@/lib/core/constants");
function toLegacyCreditStatus(rawState) {
    if (!rawState)
        return "pending";
    const normalized = rawState.toLowerCase();
    if (normalized === "complete" || normalized === "approved" || normalized === "closed")
        return "complete";
    if (normalized === "blocked" || normalized === "rejected")
        return "blocked";
    if (normalized === "in_progress" || normalized === "under_review" || normalized === "submitted" || normalized === "resubmitted") {
        return "in_progress";
    }
    if (normalized === "draft" || normalized === "assigned" || normalized === "not_started" || normalized === "pending" || normalized === "clarification" || normalized === "ready") {
        return "pending";
    }
    if (normalized in constants_1.creditStatuses)
        return normalized;
    return "pending";
}
function resolveTrackerCellStatus(credit, aliases) {
    var _a, _b;
    const requiredSlots = ((_a = credit.documents_required) !== null && _a !== void 0 ? _a : []).filter((doc) => aliases.includes(doc.type) || aliases.includes(doc.label));
    if (!requiredSlots.length || requiredSlots.every((doc) => !doc.required)) {
        return "NA";
    }
    const linkedDocs = ((_b = credit.documents) !== null && _b !== void 0 ? _b : []).filter((doc) => requiredSlots.some((slot) => slot.type === doc.doc_category || slot.label === doc.doc_category));
    if (!linkedDocs.length)
        return "Required";
    const states = linkedDocs.map((doc) => { var _a, _b; return String((_b = (_a = doc.state) !== null && _a !== void 0 ? _a : doc.status) !== null && _b !== void 0 ? _b : "").toUpperCase(); });
    if (states.some((state) => state === "REJECTED" || state === "CLARIFICATION"))
        return "Clarification";
    if (states.some((state) => state === "SUBMITTED" || state === "UNDER_REVIEW" || state === "READY" || state === "UPLOADED"))
        return "Under Review";
    return "Received";
}
