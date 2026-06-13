"use strict";
/**
 * Tracknov Knowledge Governance - Knowledge Influence Graph
 * Calculates influence percentages of individual corrections on retrieval models.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeInfluenceGraph = void 0;
class KnowledgeInfluenceGraph {
    /**
     * Estimates model change weight from edit size.
     */
    static calculateInfluence(editDistance, confidencePenalty) {
        const influence = Math.min((editDistance * 5.0) + (confidencePenalty * 50.0), 99.0);
        return {
            correctionId: `corr-${Math.random().toString(36).substr(2, 9)}`,
            influencePercentage: Number(influence.toFixed(1)),
            direction: "PROSPECTIVE_TUNING"
        };
    }
}
exports.KnowledgeInfluenceGraph = KnowledgeInfluenceGraph;
