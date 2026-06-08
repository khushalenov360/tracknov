export interface CreditState {
  creditId: string;
  readinessScore: number;
  readyForSubmission: boolean;
  completionPercentage: number;
  missingEvidence: string[];
  blockers: string[];
  approvalStatus: "DRAFT" | "IN_PROGRESS" | "UNDER_REVIEW" | "APPROVED";
  recommendedAction: string;
}

export class ProjectStateEngine {
  static evaluateCreditState(credit: any, documents: any[]): CreditState {
    const creditDocs = documents.filter(d => d.credit_id === credit.id || d.doc_category === credit.credit_code);
    
    let readinessScore = 0;
    const blockers: string[] = [];
    const missingEvidence: string[] = [];
    
    const requiredDocsCount = credit.documents_required?.length || 1;
    const uploadedCount = creditDocs.length;
    
    let completionPercentage = Math.floor((uploadedCount / requiredDocsCount) * 100);
    if (completionPercentage > 100) completionPercentage = 100;
    
    if (uploadedCount < requiredDocsCount) {
      blockers.push(`Only ${uploadedCount} of ${requiredDocsCount} required documents uploaded.`);
      missingEvidence.push(`${requiredDocsCount - uploadedCount} required document(s)`);
      readinessScore = Math.floor((uploadedCount / requiredDocsCount) * 50);
    } else {
      readinessScore = 50;
    }

    if (credit.state === "blocked") blockers.push("Credit is explicitly blocked.");
    if (creditDocs.some(d => d.state === "REJECTED")) blockers.push("One or more documents were rejected.");
    
    let approvalStatus: "DRAFT" | "IN_PROGRESS" | "UNDER_REVIEW" | "APPROVED" = "DRAFT";
    let recommendedAction = "Upload missing documents.";

    if (uploadedCount > 0 && uploadedCount < requiredDocsCount) {
      approvalStatus = "IN_PROGRESS";
    }

    if (blockers.length === 0) {
      if (creditDocs.some(d => d.state === "CLARIFICATION" || d.state === "UNDER_L3_REVIEW" || d.state === "PENDING")) {
        readinessScore = 80;
        approvalStatus = "UNDER_REVIEW";
        recommendedAction = "Wait for reviewer clarification or admin review.";
      } else if (creditDocs.every(d => d.state === "APPROVED") || credit.state === "APPROVED") {
        readinessScore = 100;
        approvalStatus = "APPROVED";
        recommendedAction = "None. Fully approved.";
      } else {
         readinessScore = 80;
         approvalStatus = "UNDER_REVIEW";
         recommendedAction = "Submit for final review.";
      }
    }

    const readyForSubmission = readinessScore >= 80 && blockers.length === 0;

    return {
      creditId: credit.id || credit.credit_code,
      readinessScore,
      readyForSubmission,
      completionPercentage,
      missingEvidence,
      blockers,
      approvalStatus,
      recommendedAction
    };
  }

  static getProjectReadiness(project: any, credits: any[], documents: any[]): Record<string, CreditState> {
    const states: Record<string, CreditState> = {};
    for (const credit of credits) {
      states[credit.credit_code] = this.evaluateCreditState(credit, documents);
    }
    return states;
  }
}

export const projectStateEngine = new ProjectStateEngine();
