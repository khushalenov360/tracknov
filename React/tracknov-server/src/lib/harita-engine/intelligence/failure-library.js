"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FailureLibrary = void 0;
// We use a simulated DB stub for now, but this hooks directly into the Learning Engine
class FailureLibrary {
    static logFailure(projectId, question, response, failureType, severity, details) {
        const failureRecord = {
            timestamp: new Date().toISOString(),
            projectId,
            question,
            response,
            failureType,
            severity,
            details
        };
        this.failures.push(failureRecord);
        console.log(`[FAILURE_LIBRARY] Logged ${failureType} severity: ${severity}`);
        console.log(`Details:`, details);
    }
    static getFailures(projectId) {
        return this.failures.filter(f => f.projectId === projectId);
    }
}
exports.FailureLibrary = FailureLibrary;
FailureLibrary.failures = [];
