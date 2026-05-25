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
  states = [
    "ASSIGNED",
    "IN_PROGRESS",
    "MAPPED",
    "L1_REVIEW",
    "L1_REJECTED",
    "READY_FOR_L3",
    "UNDER_L3_REVIEW",
    "CLARIFICATION",
    "RESUBMITTED",
    "APPROVED",
    "REJECTED",
    "REVOKED",
  ] as const;

  transitions: TransitionMap<SubmittalWorkflowState> = {
    ASSIGNED: ["IN_PROGRESS"],
    IN_PROGRESS: ["MAPPED"],
    MAPPED: ["L1_REVIEW"],
    L1_REVIEW: ["READY_FOR_L3", "L1_REJECTED", "REJECTED", "UNDER_L3_REVIEW", "CLARIFICATION"],
    L1_REJECTED: ["IN_PROGRESS"],
    READY_FOR_L3: ["UNDER_L3_REVIEW"],
    UNDER_L3_REVIEW: ["APPROVED", "CLARIFICATION", "REJECTED"],
    CLARIFICATION: ["RESUBMITTED", "IN_PROGRESS"],
    RESUBMITTED: ["UNDER_L3_REVIEW"],
    APPROVED: ["REVOKED"],
    REJECTED: ["IN_PROGRESS"],
    REVOKED: ["ASSIGNED"],
  };

  rolesAllowed: RoleTransitionMap<SubmittalWorkflowState> = {
    "ASSIGNED->IN_PROGRESS": ["L0", "L1", "L3", "L5"],
    "IN_PROGRESS->MAPPED": ["L0", "L1", "L3", "L5"],
    "MAPPED->L1_REVIEW": ["L0", "L1", "L3", "L5"],
    "L1_REVIEW->READY_FOR_L3": ["L1", "L3", "L5"],
    "L1_REVIEW->L1_REJECTED": ["L1", "L3", "L5"],
    "L1_REVIEW->REJECTED": ["L1", "L3", "L5"],
    "L1_REVIEW->UNDER_L3_REVIEW": ["L1", "L3", "L5"],
    "L1_REVIEW->CLARIFICATION": ["L1", "L3", "L5"],
    "L1_REJECTED->IN_PROGRESS": ["L0", "L1", "L3", "L5"],
    "READY_FOR_L3->UNDER_L3_REVIEW": ["L3", "L5"],
    "UNDER_L3_REVIEW->APPROVED": ["L3", "L5"],
    "UNDER_L3_REVIEW->CLARIFICATION": ["L3", "L5"],
    "UNDER_L3_REVIEW->REJECTED": ["L3", "L5"],
    "CLARIFICATION->RESUBMITTED": ["L0", "L1", "L3", "L5"],
    "CLARIFICATION->IN_PROGRESS": ["L0", "L1", "L3", "L5"],
    "RESUBMITTED->UNDER_L3_REVIEW": ["L0", "L1", "L3", "L5"],
    "APPROVED->REVOKED": ["L3", "L5"],
    "REJECTED->IN_PROGRESS": ["L0", "L1", "L3", "L5"],
    "REVOKED->ASSIGNED": ["L3", "L5"],
  };
}

export function mapTracknovRoleToWorkflowRole(role: MemberRole | null | undefined): WorkflowRole {
  const level = getRoleLevel(role);
  return `L${level}` as WorkflowRole;
}
