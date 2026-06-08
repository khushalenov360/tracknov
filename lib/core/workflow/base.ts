import { WorkflowRoleError, WorkflowTransitionError, WorkflowValidationError } from "@/lib/core/workflow/exceptions";
import type { RoleTransitionMap, TransitionMap, WorkflowRole } from "@/lib/core/workflow/types";

export abstract class BaseStateMachine<TState extends string> {
  abstract states: readonly TState[];
  abstract transitions: TransitionMap<TState>;
  abstract rolesAllowed: RoleTransitionMap<TState>;

  canTransition(fromState: TState, toState: TState, role: WorkflowRole) {
    const allowedTargets = this.transitions[fromState] ?? [];
    if (!allowedTargets.includes(toState)) {
      throw new WorkflowTransitionError(`Invalid workflow transition: ${fromState} -> ${toState}`);
    }

    const transitionKey = `${fromState}->${toState}`;
    const allowedRoles = this.rolesAllowed[transitionKey] ?? [];
    if (!allowedRoles.includes(role)) {
      throw new WorkflowRoleError(`Role ${role} cannot execute transition ${transitionKey}`);
    }
    return true;
  }

  validate(fromState: TState, toState: TState, role: WorkflowRole) {
    if (!this.states.includes(fromState) || !this.states.includes(toState)) {
      throw new WorkflowValidationError(`Unknown workflow state: ${fromState} -> ${toState}`);
    }
    return this.canTransition(fromState, toState, role);
  }

  transition<TInstance extends { status: string }>(instance: TInstance, toState: TState, role: WorkflowRole) {
    const fromState = instance.status as TState;
    this.validate(fromState, toState, role);
    return {
      ...instance,
      status: toState,
    };
  }
}
