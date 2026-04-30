import { BaseStateMachine } from "@/lib/workflow/base";
import type {
  CreditWorkflowState,
  DocumentWorkflowState,
  ProjectWorkflowState,
  RoleTransitionMap,
  TransitionMap,
  WorkflowRole,
} from "@/lib/workflow/types";

export class ProjectWorkflowMachine extends BaseStateMachine<ProjectWorkflowState> {
  states = ["draft", "ready", "active", "on_hold", "completed", "archived"] as const;
  transitions: TransitionMap<ProjectWorkflowState> = {
    draft: ["ready"],
    ready: ["active"],
    active: ["on_hold", "completed"],
    on_hold: ["active"],
    completed: ["archived"],
    archived: [],
  };
  rolesAllowed: RoleTransitionMap<ProjectWorkflowState> = {
    "draft->ready": ["admin"],
    "ready->active": ["admin"],
    "active->on_hold": ["admin", "reviewer"],
    "active->completed": ["admin", "reviewer"],
    "on_hold->active": ["admin", "reviewer"],
    "completed->archived": ["admin"],
  };
}

export class CreditWorkflowMachine extends BaseStateMachine<CreditWorkflowState> {
  states = ["draft", "assigned", "in_progress", "submitted", "under_review", "approved", "rejected", "closed"] as const;
  transitions: TransitionMap<CreditWorkflowState> = {
    draft: ["assigned"],
    assigned: ["in_progress", "closed", "rejected"],
    in_progress: ["submitted", "closed", "rejected"],
    submitted: ["under_review"],
    under_review: ["approved", "rejected"],
    approved: ["closed"],
    rejected: ["in_progress"],
    closed: [],
  };
  rolesAllowed: RoleTransitionMap<CreditWorkflowState> = {
    "draft->assigned": ["admin"],
    "assigned->in_progress": ["consultant", "admin"],
    "assigned->closed": ["admin", "reviewer"],
    "assigned->rejected": ["admin", "reviewer"],
    "in_progress->submitted": ["consultant", "admin"],
    "in_progress->closed": ["admin", "reviewer"],
    "in_progress->rejected": ["admin", "reviewer"],
    "submitted->under_review": ["reviewer", "admin"],
    "under_review->approved": ["reviewer", "admin"],
    "under_review->rejected": ["reviewer", "admin"],
    "approved->closed": ["admin", "reviewer"],
    "rejected->in_progress": ["consultant", "admin"],
  };
}

export class DocumentWorkflowMachine extends BaseStateMachine<DocumentWorkflowState> {
  states = ["uploaded", "tagged", "submitted", "under_review", "approved", "rejected", "revised"] as const;
  transitions: TransitionMap<DocumentWorkflowState> = {
    uploaded: ["tagged", "submitted"],
    tagged: ["submitted"],
    submitted: ["under_review", "rejected"],
    under_review: ["approved", "rejected"],
    approved: [],
    rejected: ["revised"],
    revised: ["submitted"],
  };
  rolesAllowed: RoleTransitionMap<DocumentWorkflowState> = {
    "uploaded->tagged": ["consultant", "admin"],
    "uploaded->submitted": ["consultant", "admin"],
    "tagged->submitted": ["consultant", "admin"],
    "submitted->under_review": ["reviewer", "admin"],
    "submitted->rejected": ["reviewer", "admin"],
    "under_review->approved": ["reviewer", "admin"],
    "under_review->rejected": ["reviewer", "admin"],
    "rejected->revised": ["consultant", "admin", "client"],
    "revised->submitted": ["consultant", "admin"],
  };
}

export function mapTracknovRoleToWorkflowRole(role: string): WorkflowRole {
  if (["super_user", "super_admin", "project_admin"].includes(role)) {
    return "admin";
  }
  if (role === "owner") {
    return "reviewer";
  }
  if (role === "client") {
    return "client";
  }
  return "consultant";
}
