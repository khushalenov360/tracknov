export interface ReuseScoreDetail {
  reuseConfidence: number; // 0 to 100
  duplicateProbability: number; // 0 to 100
  historicalApprovalIndex: number; // 0 to 10
  recommendationLevel: "HIGHLY_RECOMMENDED" | "COMPATIBLE" | "LOW_REUSE_POTENTIAL";
}

export class EvidenceReuseScorer {
  /**
   * Scores reuse profiles based on prior approval volumes, age, and semantic match deltas
   */
  static evaluateScore(
    priorApprovals: number,
    semanticSimilarity: number,
    duplicateProb: number
  ): ReuseScoreDetail {
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
    let recommendationLevel: "HIGHLY_RECOMMENDED" | "COMPATIBLE" | "LOW_REUSE_POTENTIAL" = "LOW_REUSE_POTENTIAL";
    if (reuseConfidence >= 80) {
      recommendationLevel = "HIGHLY_RECOMMENDED";
    } else if (reuseConfidence >= 45) {
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
