/**
 * Tracknov Extraction Feedback - Semantic Confidence Trainer
 * Calibrates precision coefficients and matching weights.
 */

export class SemanticConfidenceTrainer {
  /**
   * Calculates a trained weight value based on correction volumes.
   */
  public static trainConfidenceWeights(
    baseWeight: number,
    historicalCorrectionsCount: number,
    recalibrationRatio: number
  ): number {
    const penalty = historicalCorrectionsCount * 0.015 * recalibrationRatio;
    const adjusted = baseWeight - penalty;
    return Math.max(0.4, Number(adjusted.toFixed(3)));
  }
}
