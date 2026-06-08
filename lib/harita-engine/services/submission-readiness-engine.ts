import { ProjectStateEngine, CreditState } from "../runtime/project-state-engine";

export type SubmissionReadinessState = CreditState;

export class SubmissionReadinessEngine {
  evaluateCredit(credit: any, documents: any[]): SubmissionReadinessState {
    return ProjectStateEngine.evaluateCreditState(credit, documents);
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
Missing Evidence: ${evaluation.missingEvidence.join(", ") || "None"}
Approval Status: ${evaluation.approvalStatus}
Recommended Action: ${evaluation.recommendedAction}
`;
  }
}

export const submissionReadinessEngine = new SubmissionReadinessEngine();

