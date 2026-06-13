"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submissionReadinessEngine = exports.SubmissionReadinessEngine = void 0;
const project_state_engine_1 = require("../runtime/project-state-engine");
class SubmissionReadinessEngine {
    evaluateCredit(credit, documents) {
        return project_state_engine_1.ProjectStateEngine.evaluateCreditState(credit, documents);
    }
    generateContextString(credit, documents) {
        if (!credit)
            return "";
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
exports.SubmissionReadinessEngine = SubmissionReadinessEngine;
exports.submissionReadinessEngine = new SubmissionReadinessEngine();
