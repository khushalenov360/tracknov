import { BaseStateMachine } from "@/lib/workflow/base";
import { getRoleLevel } from "@/lib/rbac";
import type { MemberRole } from "@/lib/types";
import type {
  ProjectCertificationState,
  SubmittalWorkflowState,
  TransitionMap,
  RoleTransitionMap,
  WorkflowRole,
} from "@/lib/workflow/types";

/**
 * TRACKNOV AUTHORITATIVE WORKFLOW MACHINES
 * 
 * Implements Section 3 "DETERMINISTIC RUNTIME GATING" and 
 * Section 8 "RBAC HIERARCHY (Authoritative)".
 */

export class ProjectCertificationMachine extends BaseStateMachine<ProjectCertificationState> {
  states = ["NOT_STARTED", "IN_PROGRESS", "ELIGIBLE", "CERTIFIED", "CERTIFIED_LOCKED"] as const;
  
  transitions: TransitionMap<ProjectCertificationState> = {
    NOT_STARTED: ["IN_PROGRESS"],
    IN_PROGRESS: ["ELIGIBLE", "NOT_STARTED"],
    ELIGIBLE: ["CERTIFIED", "IN_PROGRESS"],
    CERTIFIED: ["CERTIFIED_LOCKED", "ELIGIBLE"],
    CERTIFIED_LOCKED: [], // Terminal state
  };

  rolesAllowed: RoleTransitionMap<ProjectCertificationState> = {
    "NOT_STARTED->IN_PROGRESS": ["L3", "L5"],
    "IN_PROGRESS->ELIGIBLE": ["L3", "L5"],
    "ELIGIBLE->CERTIFIED": ["L3", "L5"],
    "CERTIFIED->CERTIFIED_LOCKED": ["L5"], // Only L5 can seal a project
    "CERTIFIED->ELIGIBLE": ["L5"],
    "ELIGIBLE->IN_PROGRESS": ["L3", "L5"],
  };
}

export class SubmittalWorkflowMachine extends BaseStateMachine<SubmittalWorkflowState> {
  states = ["DRAFT", "READY", "SUBMITTED", "UNDER_REVIEW", "CLARIFICATION", "RESUBMITTED", "APPROVED", "REJECTED", "ELIMINATED"] as const;

  transitions: TransitionMap<SubmittalWorkflowState> = {
    DRAFT: ["READY", "ELIMINATED"],
    READY: ["SUBMITTED", "DRAFT"],
    SUBMITTED: ["UNDER_REVIEW"],
    UNDER_REVIEW: ["CLARIFICATION", "APPROVED", "REJECTED"],
    CLARIFICATION: ["RESUBMITTED", "ELIMINATED"],
    RESUBMITTED: ["UNDER_REVIEW"],
    APPROVED: ["REJECTED"], // Can be revoked
    REJECTED: ["DRAFT", "ELIMINATED"],
    ELIMINATED: [],
  };

  rolesAllowed: RoleTransitionMap<SubmittalWorkflowState> = {
    "DRAFT->READY": ["L0", "L1", "L3", "L5"],
    "READY->SUBMITTED": ["L0", "L1", "L3", "L5"],
    "SUBMITTED->UNDER_REVIEW": ["L1", "L3", "L5"], // Owner reviews first
    "UNDER_REVIEW->CLARIFICATION": ["L1", "L3", "L5"],
    "UNDER_REVIEW->APPROVED": ["L3", "L5"], // Only L3 can formally approve for certification
    "UNDER_REVIEW->REJECTED": ["L3", "L5"],
    "CLARIFICATION->RESUBMITTED": ["L0", "L1", "L3", "L5"],
    "APPROVED->REJECTED": ["L3", "L5"],
    "REJECTED->DRAFT": ["L0", "L1", "L3", "L5"],
  };
}

export function mapTracknovRoleToWorkflowRole(role: MemberRole | null | undefined): WorkflowRole {
  const level = getRoleLevel(role);
  return `L${level}` as WorkflowRole;
}
