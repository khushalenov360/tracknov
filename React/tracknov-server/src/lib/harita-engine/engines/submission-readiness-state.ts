export interface SubmissionReadinessState {
  readinessScore: number;
  readyForSubmission: boolean;
  blockers: string[];
  missingEvidence: string[];
  approvalStatus: "APPROVED" | "PENDING" | "REJECTED" | "NOT_READY";
  recommendedAction: string;
}

export class SubmissionReadinessEngine {
  /**
   * Generates a single, canonical readiness state for a given credit based on uploaded evidence and project state.
   */
  public static computeReadiness(
    creditCode: string,
    uploadedDocuments: any[],
    requiredEvidenceList: any[]
  ): SubmissionReadinessState {
    const missingEvidence: string[] = [];
    const blockers: string[] = [];

    let score = 0;
    const totalRequired = requiredEvidenceList.length;

    requiredEvidenceList.forEach(req => {
      const isUploaded = uploadedDocuments.some(doc => doc.mappedTo === req.id || doc.mappedCredit === creditCode);
      if (isUploaded) {
        score += (100 / totalRequired);
      } else {
        missingEvidence.push(req.name);
        if (req.isCritical) {
          blockers.push(`Missing critical document: ${req.name}`);
        }
      }
    });

    // Handle edge case where no evidence is required
    if (totalRequired === 0) {
      score = 100;
    }

    const readinessScore = Math.min(100, Math.round(score));
    const readyForSubmission = readinessScore === 100 && blockers.length === 0;
    
    return {
      readinessScore,
      readyForSubmission,
      blockers,
      missingEvidence,
      approvalStatus: readyForSubmission ? "PENDING" : "NOT_READY",
      recommendedAction: readyForSubmission 
        ? "All documents uploaded. Ready for Project Manager review." 
        : `Upload missing documents: ${missingEvidence.join(", ")}`
    };
  }
}
