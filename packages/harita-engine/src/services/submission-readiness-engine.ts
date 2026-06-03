export type SubmissionState = 
  | "READY" 
  | "PARTIAL" 
  | "INCOMPLETE" 
  | "REVIEW_REQUIRED" 
  | "CLARIFICATION_PENDING" 
  | "REJECTED" 
  | "APPROVED";

export interface ReadinessEvaluation {
  readinessScore: number;
  blockers: string[];
  warnings: string[];
  readyForSubmission: boolean;
  state?: SubmissionState; // legacy
}

export class SubmissionReadinessEngine {
  evaluateCredit(credit: any, documents: any[]): ReadinessEvaluation {
    const creditDocs = documents.filter(d => d.credit_id === credit.id || d.doc_category === credit.credit_code);
    
    let readinessScore = 0;
    const blockers: string[] = [];
    const warnings: string[] = [];
    
    if (credit.state === "APPROVED") {
      return { readinessScore: 100, blockers: [], warnings: [], readyForSubmission: true, state: "APPROVED" };
    }
    
    if (credit.state === "blocked") {
      blockers.push("Credit is explicitly blocked.");
    }
    
    if (creditDocs.some(d => d.state === "REJECTED")) {
      blockers.push("One or more documents were rejected.");
    }
    
    if (creditDocs.some(d => d.state === "CLARIFICATION")) {
      warnings.push("Awaiting response to reviewer clarification.");
    }
    
    if (creditDocs.some(d => d.state === "UNDER_L3_REVIEW")) {
      warnings.push("Documents are awaiting admin review.");
    }
    
    const requiredDocsCount = credit.documents_required?.length || 1;
    if (creditDocs.length === 0) {
      blockers.push("No evidence uploaded yet.");
    } else if (creditDocs.length < requiredDocsCount) {
      blockers.push(`Only ${creditDocs.length} of ${requiredDocsCount} required documents uploaded.`);
      readinessScore = Math.floor((creditDocs.length / requiredDocsCount) * 50);
    } else {
      readinessScore = 50; // Documents uploaded, but not approved
    }

    if (blockers.length === 0 && warnings.length === 0) {
      readinessScore = 80; // Ready for review
    }
    
    if (creditDocs.every(d => d.state === "APPROVED")) {
      readinessScore = 100;
    }

    return {
      readinessScore,
      blockers,
      warnings,
      readyForSubmission: readinessScore >= 80,
      state: blockers.length > 0 ? "INCOMPLETE" : "READY"
    };
  }

  generateContextString(credit: any, documents: any[]): string {
    if (!credit) return "";
    const evaluation = this.evaluateCredit(credit, documents);
    
    return `
[SUBMISSION READINESS ENGINE]
Active Credit: ${credit.credit_code}
Readiness Score: ${evaluation.readinessScore}/100
Ready for Submission: ${evaluation.readyForSubmission}
Blockers: ${evaluation.blockers.join(", ") || "None"}
Warnings: ${evaluation.warnings.join(", ") || "None"}
`;
  }
}

export const submissionReadinessEngine = new SubmissionReadinessEngine();
