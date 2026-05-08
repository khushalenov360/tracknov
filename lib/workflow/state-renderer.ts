import type { DocumentStatus } from "@/lib/types";

export type CanonicalWorkflowState =
  | "DRAFT"
  | "READY"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CLARIFICATION"
  | "RESUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "ELIMINATED";

export type WorkflowLockMode = "editable" | "limited_edit" | "locked" | "read_only" | "immutable";

export type WorkflowStateRender = {
  state: CanonicalWorkflowState;
  label: string;
  tone: "neutral" | "info" | "warning" | "success" | "danger" | "muted";
  lockMode: WorkflowLockMode;
  locked: boolean;
  editAllowed: boolean;
  allowedActions: string[];
  blocker: string | null;
};

const legacyStateMap: Record<string, CanonicalWorkflowState> = {
  uploaded: "SUBMITTED",
  owner_approved: "UNDER_REVIEW",
  approved: "APPROVED",
  rejected: "REJECTED",
};

const stateContracts: Record<CanonicalWorkflowState, Omit<WorkflowStateRender, "state">> = {
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

export function normalizeWorkflowState(state?: DocumentStatus | string | null): CanonicalWorkflowState {
  const raw = String(state ?? "DRAFT");
  const upper = raw.toUpperCase();
  if (upper in stateContracts) {
    return upper as CanonicalWorkflowState;
  }
  return legacyStateMap[raw] ?? "DRAFT";
}

export function workflowStateRenderer(state?: DocumentStatus | string | null): WorkflowStateRender {
  const canonical = normalizeWorkflowState(state);
  return {
    state: canonical,
    ...stateContracts[canonical],
  };
}

export function workflowAllowedActions(state?: DocumentStatus | string | null) {
  return workflowStateRenderer(state).allowedActions;
}
