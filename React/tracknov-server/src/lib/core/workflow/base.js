"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseStateMachine = void 0;
const exceptions_1 = require("@/lib/core/workflow/exceptions");
class BaseStateMachine {
    canTransition(fromState, toState, role) {
        var _a, _b;
        const allowedTargets = (_a = this.transitions[fromState]) !== null && _a !== void 0 ? _a : [];
        if (!allowedTargets.includes(toState)) {
            throw new exceptions_1.WorkflowTransitionError(`Invalid workflow transition: ${fromState} -> ${toState}`);
        }
        const transitionKey = `${fromState}->${toState}`;
        const allowedRoles = (_b = this.rolesAllowed[transitionKey]) !== null && _b !== void 0 ? _b : [];
        if (!allowedRoles.includes(role)) {
            throw new exceptions_1.WorkflowRoleError(`Role ${role} cannot execute transition ${transitionKey}`);
        }
        return true;
    }
    validate(fromState, toState, role) {
        if (!this.states.includes(fromState) || !this.states.includes(toState)) {
            throw new exceptions_1.WorkflowValidationError(`Unknown workflow state: ${fromState} -> ${toState}`);
        }
        return this.canTransition(fromState, toState, role);
    }
    transition(instance, toState, role) {
        const fromState = instance.status;
        this.validate(fromState, toState, role);
        return Object.assign(Object.assign({}, instance), { status: toState });
    }
}
exports.BaseStateMachine = BaseStateMachine;
