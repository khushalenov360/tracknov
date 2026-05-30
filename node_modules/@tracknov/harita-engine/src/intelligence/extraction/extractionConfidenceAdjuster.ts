/**
 * Tracknov Extraction Feedback - Extraction Confidence Adjuster
 * Calibrates extraction confidence prospectively based on correction rates.
 */

export class ExtractionConfidenceAdjuster {
  /**
   * Calculates a recalibrated confidence score based on previous feedback trends.
   */
  public static calculateRecalibratedConfidence(
    currentConfidence: number,
    totalCorrectionsCount: number,
    failureType: string
  ): number {
    // Each correction incurs a prospective penalty of 2%
    let penalty = 0.02 * totalCorrectionsCount;

    // Apply specific category penalties
    switch (failureType) {
      case "CLARIFICATION_HALLUCINATION":
        penalty += 0.05; // Extra 5% penalty for semantic hallucination errors
        break;
      case "DUPLICATE_FALSE_POSITIVE":
        penalty += 0.03; // Extra 3% penalty for duplicate detection errors
        break;
      case "UNIT_MISREAD":
        penalty += 0.04; // Extra 4% penalty for technical engineering value misreads
        break;
    }

    // Cap penalty at 35% to prevent complete lockouts
    if (penalty > 0.35) {
      penalty = 0.35;
    }

    const recalibrated = currentConfidence - penalty;
    return Math.max(0.1, Math.min(1.0, Number(recalibrated.toFixed(3))));
  }
}
