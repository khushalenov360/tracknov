"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditWorkflowMachine = exports.SubmittalWorkflowMachine = exports.ProjectCertificationMachine = void 0;
exports.mapTracknovRoleToWorkflowRole = mapTracknovRoleToWorkflowRole;
const base_1 = require("@/lib/core/workflow/base");
const rbac_1 = require("@/lib/rbac");
/**
 * TRACKNOV AUTHORITATIVE WORKFLOW MACHINES
 *
 * Implements Section 3 "DETERMINISTIC RUNTIME GATING" and
 * Section 8 "RBAC HIERARCHY (Authoritative)".
 */
class ProjectCertificationMachine extends base_1.BaseStateMachine {
    constructor() {
        super(...arguments);
        this.states = ["NOT_STARTED", "IN_PROGRESS", "ELIGIBLE", "CERTIFIED", "CERTIFIED_LOCKED"];
        this.transitions = {
            NOT_STARTED: ["IN_PROGRESS"],
            IN_PROGRESS: ["ELIGIBLE", "NOT_STARTED"],
            ELIGIBLE: ["CERTIFIED", "IN_PROGRESS"],
            CERTIFIED: ["CERTIFIED_LOCKED", "ELIGIBLE"],
            CERTIFIED_LOCKED: [], // Terminal state
        };
        this.rolesAllowed = {
            "NOT_STARTED->IN_PROGRESS": ["L3", "L5"],
            "IN_PROGRESS->ELIGIBLE": ["L3", "L5"],
            "ELIGIBLE->CERTIFIED": ["L3", "L5"],
            "CERTIFIED->CERTIFIED_LOCKED": ["L5"], // Only L5 can seal a project
            "CERTIFIED->ELIGIBLE": ["L5"],
            "ELIGIBLE->IN_PROGRESS": ["L3", "L5"],
        };
    }
}
exports.ProjectCertificationMachine = ProjectCertificationMachine;
class SubmittalWorkflowMachine extends base_1.BaseStateMachine {
    constructor() {
        super(...arguments);
        this.states = [
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
        ];
        this.transitions = {
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
        this.rolesAllowed = {
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
}
exports.SubmittalWorkflowMachine = SubmittalWorkflowMachine;
function mapTracknovRoleToWorkflowRole(role) {
    const level = (0, rbac_1.getRoleLevel)(role);
    return `L${level}`;
}
class CreditWorkflowMachine extends base_1.BaseStateMachine {
    constructor() {
        super(...arguments);
        this.states = ["EVALUATING", "TARGETED", "IN_PROGRESS", "ACHIEVED", "DROPPED"];
        this.transitions = {
            EVALUATING: ["TARGETED", "DROPPED"],
            TARGETED: ["IN_PROGRESS", "DROPPED", "EVALUATING"],
            IN_PROGRESS: ["ACHIEVED", "TARGETED", "DROPPED"],
            ACHIEVED: ["IN_PROGRESS"], // E.g., if certification revokes it
            DROPPED: ["EVALUATING"],
        };
        this.rolesAllowed = {
            "EVALUATING->TARGETED": ["L3", "L5"],
            "EVALUATING->DROPPED": ["L3", "L5"],
            "TARGETED->IN_PROGRESS": ["L1", "L3", "L5"],
            "TARGETED->DROPPED": ["L3", "L5"],
            "TARGETED->EVALUATING": ["L3", "L5"],
            "IN_PROGRESS->ACHIEVED": ["L3", "L5"], // Only managers can mark credit achieved
            "IN_PROGRESS->TARGETED": ["L1", "L3", "L5"],
            "IN_PROGRESS->DROPPED": ["L3", "L5"],
            "ACHIEVED->IN_PROGRESS": ["L5"], // Only owners can revert an achieved credit
            "DROPPED->EVALUATING": ["L3", "L5"],
        };
    }
}
exports.CreditWorkflowMachine = CreditWorkflowMachine;
