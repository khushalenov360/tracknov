"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceReuseScorer = void 0;
class EvidenceReuseScorer {
    /**
     * Scores reuse profiles based on prior approval volumes, age, and semantic match deltas
     */
    static evaluateScore(priorApprovals, semanticSimilarity, duplicateProb) {
        // 1. Calculate base reuse confidence
        let baseConfidence = (semanticSimilarity * 70) + (priorApprovals * 2.5);
        // De-escalate score if duplication risk is extremely high (indicating potential spam)
        if (duplicateProb > 80) {
            baseConfidence -= (duplicateProb - 80) * 0.5;
        }
        const reuseConfidence = Math.max(0, Math.min(100, Math.round(baseConfidence)));
        // 2. Define historical approval multiplier
        const historicalApprovalIndex = parseFloat(Math.min(10, Math.max(0, priorApprovals * 0.7)).toFixed(1));
        // 3. Output operational recommendations
        let recommendationLevel = "LOW_REUSE_POTENTIAL";
        if (reuseConfidence >= 80) {
            recommendationLevel = "HIGHLY_RECOMMENDED";
        }
        else if (reuseConfidence >= 45) {
            recommendationLevel = "COMPATIBLE";
        }
        return {
            reuseConfidence,
            duplicateProbability: Math.round(duplicateProb),
            historicalApprovalIndex,
            recommendationLevel,
        };
    }
}
exports.EvidenceReuseScorer = EvidenceReuseScorer;
