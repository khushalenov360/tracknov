"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditIntelligenceEngine = void 0;
class CreditIntelligenceEngine {
    static evaluateCredit(creditId, context) {
        const credit = context.credits.find(c => c.id === creditId);
        if (!credit)
            throw new Error("Credit not found in context");
        const graph = context.creditAssignmentGraph.get(creditId);
        const hasAssignments = graph && graph.requirements.length > 0;
        const requirementsMet = credit.status === 'complete' || credit.status === 'APPROVED';
        return {
            creditCode: credit.credit_code,
            status: credit.status,
            actionable: !hasAssignments || requirementsMet,
            missingTasks: (graph === null || graph === void 0 ? void 0 : graph.requirements.map(r => r.requirementType)) || []
        };
    }
}
exports.CreditIntelligenceEngine = CreditIntelligenceEngine;
