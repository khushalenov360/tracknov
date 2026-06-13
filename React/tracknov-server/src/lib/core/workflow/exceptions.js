"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowValidationError = exports.WorkflowRoleError = exports.WorkflowTransitionError = void 0;
class WorkflowTransitionError extends Error {
    constructor(message) {
        super(message);
        this.name = "WorkflowTransitionError";
    }
}
exports.WorkflowTransitionError = WorkflowTransitionError;
class WorkflowRoleError extends Error {
    constructor(message) {
        super(message);
        this.name = "WorkflowRoleError";
    }
}
exports.WorkflowRoleError = WorkflowRoleError;
class WorkflowValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "WorkflowValidationError";
    }
}
exports.WorkflowValidationError = WorkflowValidationError;
