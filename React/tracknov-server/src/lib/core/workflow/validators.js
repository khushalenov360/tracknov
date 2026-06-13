"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCreditCanClose = validateCreditCanClose;
exports.validateProjectCanComplete = validateProjectCanComplete;
const exceptions_1 = require("@/lib/core/workflow/exceptions");
function validateCreditCanClose(args) {
    if (!args.linkedDocumentsApproved) {
        throw new exceptions_1.WorkflowValidationError("Credit cannot be approved/closed until all linked documents are approved.");
    }
}
function validateProjectCanComplete(args) {
    if (!args.allCreditsClosed) {
        throw new exceptions_1.WorkflowValidationError("Project cannot be completed until all credits are closed.");
    }
}
