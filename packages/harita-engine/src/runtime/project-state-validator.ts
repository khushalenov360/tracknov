export class ConsistencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConsistencyError";
  }
}

export interface ProjectStateSnapshot {
  uploadedDocumentsCount: number;
  evidenceGraphNodesCount: number;
  activeMappedFilesCount: number;
}

export class ProjectStateValidator {
  validateState(snapshot: ProjectStateSnapshot, context?: any) {
    if (snapshot.uploadedDocumentsCount === 0 && snapshot.evidenceGraphNodesCount > 0) {
      throw new ConsistencyError("State violation: 0 uploaded documents but evidence exists in graph.");
    }

    if (snapshot.activeMappedFilesCount > snapshot.uploadedDocumentsCount) {
      throw new ConsistencyError("State violation: Mapped files count exceeds total uploaded documents.");
    }

    return true;
  }
}

export const projectStateValidator = new ProjectStateValidator();
