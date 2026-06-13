"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeWorkflowState = normalizeWorkflowState;
exports.workflowStateRenderer = workflowStateRenderer;
exports.workflowAllowedActions = workflowAllowedActions;
const legacyStateMap = {
    uploaded: "SUBMITTED",
    owner_approved: "UNDER_REVIEW",
    approved: "APPROVED",
    rejected: "REJECTED",
    L1_REVIEW: "SUBMITTED",
    UNDER_L3_REVIEW: "UNDER_REVIEW",
    L1_REJECTED: "REJECTED",
    ASSIGNED: "DRAFT",
    IN_PROGRESS: "DRAFT",
    MAPPED: "READY",
    READY_FOR_L3: "READY",
    REVOKED: "REJECTED",
};
const stateContracts = {
    DRAFT: {
        label: "Draft",
        tone: "neutral",
        lockMode: "editable",
        locked: false,
        editAllowed: true,
        allowedActions: ["mark_ready"],
        blocker: null,
    },
    READY: {
        label: "Ready",
        tone: "info",
        lockMode: "limited_edit",
        locked: false,
        editAllowed: true,
        allowedActions: ["submit"],
        blocker: null,
    },
    SUBMITTED: {
        label: "Submitted",
        tone: "info",
        lockMode: "locked",
        locked: true,
        editAllowed: false,
        allowedActions: ["start_owner_review", "request_clarification", "reject"],
        blocker: "Submitted evidence is locked until review returns an action.",
    },
    UNDER_REVIEW: {
        label: "Under review",
        tone: "warning",
        lockMode: "read_only",
        locked: true,
        editAllowed: false,
        allowedActions: ["approve", "request_clarification", "reject"],
        blocker: "Reviewer has control of this evidence.",
    },
    CLARIFICATION: {
        label: "Clarification",
        tone: "warning",
        lockMode: "editable",
        locked: false,
        editAllowed: true,
        allowedActions: ["resubmit"],
        blocker: null,
    },
    RESUBMITTED: {
        label: "Resubmitted",
        tone: "info",
        lockMode: "locked",
        locked: true,
        editAllowed: false,
        allowedActions: ["start_admin_review"],
        blocker: "Resubmitted evidence is locked until validation starts.",
    },
    APPROVED: {
        label: "Approved",
        tone: "success",
        lockMode: "immutable",
        locked: true,
        editAllowed: false,
        allowedActions: [],
        blocker: "Approved evidence is immutable.",
    },
    REJECTED: {
        label: "Rejected",
        tone: "danger",
        lockMode: "editable",
        locked: false,
        editAllowed: true,
        allowedActions: [],
        blocker: null,
    },
    ELIMINATED: {
        label: "Eliminated",
        tone: "muted",
        lockMode: "immutable",
        locked: true,
        editAllowed: false,
        allowedActions: [],
        blocker: "This evidence has been eliminated from the active workflow.",
    },
};
function normalizeWorkflowState(state) {
    var _a, _b;
    const raw = String(state !== null && state !== void 0 ? state : "DRAFT");
    const upper = raw.toUpperCase();
    if (upper in stateContracts) {
        return upper;
    }
    return (_b = (_a = legacyStateMap[raw]) !== null && _a !== void 0 ? _a : legacyStateMap[upper]) !== null && _b !== void 0 ? _b : "DRAFT";
}
function workflowStateRenderer(state) {
    const canonical = normalizeWorkflowState(state);
    return Object.assign({ state: canonical }, stateContracts[canonical]);
}
function workflowAllowedActions(state) {
    return workflowStateRenderer(state).allowedActions;
}
