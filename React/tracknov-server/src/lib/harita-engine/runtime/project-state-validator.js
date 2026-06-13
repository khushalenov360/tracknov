"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectStateValidator = exports.ProjectStateValidator = exports.ConsistencyError = void 0;
class ConsistencyError extends Error {
    constructor(message) {
        super(message);
        this.name = "ConsistencyError";
    }
}
exports.ConsistencyError = ConsistencyError;
class ProjectStateValidator {
    validateState(snapshot, context) {
        if (snapshot.uploadedDocumentsCount === 0 && snapshot.evidenceGraphNodesCount > 0) {
            throw new ConsistencyError("State violation: 0 uploaded documents but evidence exists in graph.");
        }
        if (snapshot.activeMappedFilesCount > snapshot.uploadedDocumentsCount) {
            throw new ConsistencyError("State violation: Mapped files count exceeds total uploaded documents.");
        }
        return true;
    }
}
exports.ProjectStateValidator = ProjectStateValidator;
exports.projectStateValidator = new ProjectStateValidator();
