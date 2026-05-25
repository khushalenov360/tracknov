export type WorkflowEntityType = "project" | "credit" | "submittal" | "document";

export type WorkflowRole = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";

export type ProjectCertificationState =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "ELIGIBLE"
  | "CERTIFIED"
  | "CERTIFIED_LOCKED";

export type SubmittalWorkflowState =
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "MAPPED"
  | "L1_REVIEW"
  | "L1_REJECTED"
  | "READY_FOR_L3"
  | "UNDER_L3_REVIEW"
  | "CLARIFICATION"
  | "RESUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "REVOKED";

// Legacy Aliases (to prevent breakage while migrating)
export type ProjectWorkflowState = ProjectCertificationState | string;
export type CreditWorkflowState = string;
export type DocumentWorkflowState = SubmittalWorkflowState | string;

export type TransitionMap<TState extends string> = Record<TState, TState[]>;
export type RoleTransitionMap<TState extends string> = Record<string, WorkflowRole[]>;
