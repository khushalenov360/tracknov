export type RuntimeEntityType = "document" | "submittal";

export type RuntimeWorkflowState =
  | "DRAFT"
  | "READY"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CLARIFICATION"
  | "RESUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "ELIMINATED";

const transitionMap: Record<RuntimeWorkflowState, ReadonlyArray<RuntimeWorkflowState>> = {
  DRAFT: ["READY"],
  READY: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "REJECTED", "CLARIFICATION"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "CLARIFICATION"],
  CLARIFICATION: ["RESUBMITTED", "ELIMINATED"],
  RESUBMITTED: ["UNDER_REVIEW", "REJECTED", "CLARIFICATION"],
  APPROVED: [],
  REJECTED: ["RESUBMITTED", "ELIMINATED"],
  ELIMINATED: [],
};

export function isRuntimeState(value: string): value is RuntimeWorkflowState {
  return Object.prototype.hasOwnProperty.call(transitionMap, value);
}

export function canTransitionRuntimeState(
  fromState: RuntimeWorkflowState,
  toState: RuntimeWorkflowState,
): boolean {
  return (transitionMap[fromState] ?? []).includes(toState);
}

export function assertRuntimeTransition(
  fromState: RuntimeWorkflowState,
  toState: RuntimeWorkflowState,
): void {
  if (!canTransitionRuntimeState(fromState, toState)) {
    throw new Error(`Illegal workflow transition: ${fromState} -> ${toState}`);
  }
}

export function getAllowedRuntimeTransitions(fromState: RuntimeWorkflowState): RuntimeWorkflowState[] {
  return [...(transitionMap[fromState] ?? [])];
}
