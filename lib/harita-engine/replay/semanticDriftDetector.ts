/**
 * Tracknov Knowledge Governance - Semantic Drift Detector
 * Monitors cosine distance drift or semantic tag volatility across submittals.
 */

export type SemanticDriftAlert = {
  driftType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  affectedModule: string;
  driftDelta: number;
  confidenceImpact: number;
  triggeredAt: string;
};

export class SemanticDriftDetector {
  /**
   * Scans a series of extraction vectors and outputs a drift alert if shifts are detected.
   */
  public static detectDrift(
    historicalAverages: number[],
    currentBatchAverages: number[]
  ): SemanticDriftAlert | null {
    if (historicalAverages.length === 0 || currentBatchAverages.length === 0) return null;

    const histMean = historicalAverages.reduce((a, b) => a + b, 0) / historicalAverages.length;
    const currMean = currentBatchAverages.reduce((a, b) => a + b, 0) / currentBatchAverages.length;

    const delta = Math.abs(currMean - histMean);

    if (delta > 0.15) {
      return {
        driftType: "RETRIEVAL_PRECISION_COLLAPSE",
        severity: "CRITICAL",
        affectedModule: "SemanticRetrievalEngine",
        driftDelta: delta,
        confidenceImpact: 0.18,
        triggeredAt: new Date().toISOString()
      };
    } else if (delta > 0.08) {
      return {
        driftType: "SEMANTIC_TAG_VOLATILITY",
        severity: "MEDIUM",
        affectedModule: "FrameworkSemanticTagger",
        driftDelta: delta,
        confidenceImpact: 0.07,
        triggeredAt: new Date().toISOString()
      };
    }

    return null;
  }
}
