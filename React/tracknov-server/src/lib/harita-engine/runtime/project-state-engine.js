"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectStateEngine = exports.ProjectStateEngine = void 0;
class ProjectStateEngine {
    static evaluateCreditState(credit, documents) {
        var _a;
        const creditDocs = documents.filter(d => d.credit_id === credit.id || d.doc_category === credit.credit_code);
        let readinessScore = 0;
        const blockers = [];
        const missingEvidence = [];
        const requiredDocsCount = ((_a = credit.documents_required) === null || _a === void 0 ? void 0 : _a.length) || 1;
        const uploadedCount = creditDocs.length;
        let completionPercentage = Math.floor((uploadedCount / requiredDocsCount) * 100);
        if (completionPercentage > 100)
            completionPercentage = 100;
        if (uploadedCount < requiredDocsCount) {
            blockers.push(`Only ${uploadedCount} of ${requiredDocsCount} required documents uploaded.`);
            missingEvidence.push(`${requiredDocsCount - uploadedCount} required document(s)`);
            readinessScore = Math.floor((uploadedCount / requiredDocsCount) * 50);
        }
        else {
            readinessScore = 50;
        }
        if (credit.state === "blocked")
            blockers.push("Credit is explicitly blocked.");
        if (creditDocs.some(d => d.state === "REJECTED"))
            blockers.push("One or more documents were rejected.");
        let approvalStatus = "DRAFT";
        let recommendedAction = "Upload missing documents.";
        if (uploadedCount > 0 && uploadedCount < requiredDocsCount) {
            approvalStatus = "IN_PROGRESS";
        }
        if (blockers.length === 0) {
            if (creditDocs.some(d => d.state === "CLARIFICATION" || d.state === "UNDER_L3_REVIEW" || d.state === "PENDING")) {
                readinessScore = 80;
                approvalStatus = "UNDER_REVIEW";
                recommendedAction = "Wait for reviewer clarification or admin review.";
            }
            else if (creditDocs.every(d => d.state === "APPROVED") || credit.state === "APPROVED") {
                readinessScore = 100;
                approvalStatus = "APPROVED";
                recommendedAction = "None. Fully approved.";
            }
            else {
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
    static getProjectReadiness(project, credits, documents) {
        const states = {};
        for (const credit of credits) {
            states[credit.credit_code] = this.evaluateCreditState(credit, documents);
        }
        return states;
    }
}
exports.ProjectStateEngine = ProjectStateEngine;
exports.projectStateEngine = new ProjectStateEngine();
