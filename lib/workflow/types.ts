export type WorkflowEntityType = "project" | "credit" | "document";

export type WorkflowRole = "admin" | "consultant" | "reviewer" | "client";

export type ProjectWorkflowState =
  | "draft"
  | "ready"
  | "active"
  | "on_hold"
  | "completed"
  | "archived";

export type CreditWorkflowState =
  | "draft"
  | "assigned"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "closed";

export type DocumentWorkflowState =
  | "uploaded"
  | "tagged"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "revised"
  | "eliminated";

export type TransitionMap<TState extends string> = Record<TState, TState[]>;
export type RoleTransitionMap<TState extends string> = Record<string, WorkflowRole[]>;
