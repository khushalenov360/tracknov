export type SubmissionState = 
  | "READY" 
  | "PARTIAL" 
  | "INCOMPLETE" 
  | "REVIEW_REQUIRED" 
  | "CLARIFICATION_PENDING" 
  | "REJECTED" 
  | "APPROVED";

export class SubmissionReadinessEngine {
  evaluateCredit(credit: any, documents: any[]): { state: SubmissionState; reason: string } {
    const creditDocs = documents.filter(d => d.credit_id === credit.id || d.doc_category === credit.credit_code);
    
    if (credit.state === "APPROVED") {
      return { state: "APPROVED", reason: "Credit has been fully approved by the reviewer." };
    }
    
    if (credit.state === "blocked") {
      return { state: "INCOMPLETE", reason: "Credit is blocked and missing fundamental requirements." };
    }
    
    if (creditDocs.some(d => d.state === "REJECTED")) {
      return { state: "REJECTED", reason: "One or more documents for this credit were rejected." };
    }
    
    if (creditDocs.some(d => d.state === "CLARIFICATION")) {
      return { state: "CLARIFICATION_PENDING", reason: "Awaiting response to reviewer clarification." };
    }
    
    if (creditDocs.some(d => d.state === "UNDER_L3_REVIEW")) {
      return { state: "REVIEW_REQUIRED", reason: "Documents are uploaded and awaiting admin review." };
    }
    
    if (creditDocs.length > 0) {
      // Simplistic check for PARTIAL vs READY. In a real scenario, this checks the `documents_required` array.
      if (creditDocs.length < (credit.documents_required?.length || 1)) {
        return { state: "PARTIAL", reason: `Only ${creditDocs.length} documents uploaded. More evidence required.` };
      }
      return { state: "READY", reason: "All required evidence appears to be uploaded and ready for review." };
    }

    return { state: "INCOMPLETE", reason: "No evidence uploaded yet." };
  }

  generateContextString(credit: any, documents: any[]): string {
    if (!credit) return "";
    const evaluation = this.evaluateCredit(credit, documents);
    
    return `
[SUBMISSION READINESS ENGINE]
Active Credit: ${credit.credit_code}
Status: ${evaluation.state}
Reasoning: ${evaluation.reason}
`;
  }
}

export const submissionReadinessEngine = new SubmissionReadinessEngine();
