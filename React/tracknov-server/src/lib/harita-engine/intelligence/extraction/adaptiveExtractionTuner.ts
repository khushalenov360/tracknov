/**
 * Tracknov Extraction Feedback - Adaptive Extraction Tuner
 * Analyzes historical logs to dynamically adjust threshold metrics prospectively.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface TuningResult {
  extractionType: string;
  recommendedThreshold: number;
  totalErrorsCount: number;
  acceptanceRate: number;
}

export class AdaptiveExtractionTuner {
  /**
   * Evaluates correction rates and tunes baseline confidence thresholds prospectively.
   */
  public static async tuneThreshold(extractionType: string, baseThreshold: number): Promise<TuningResult> {
    try {
      const supabase = createAdminClient();

      // Retrieve total corrections count
      const { count: correctionsCount } = await supabase
        .from("extraction_corrections")
        .select("*", { count: "exact", head: true })
        .eq("extraction_type", extractionType);

      const totalErrors = correctionsCount || 0;

      // Adjust threshold prospectively: standard drift increase based on error rate
      const errorRateModifier = Math.min(0.20, totalErrors * 0.02);
      const recommendedThreshold = Math.min(0.95, baseThreshold + errorRateModifier);

      // Compute simple simulated acceptance rate based on error historical volume
      const acceptanceRate = Math.max(0.60, 1.0 - (totalErrors * 0.04));

      return {
        extractionType,
        recommendedThreshold: Number(recommendedThreshold.toFixed(3)),
        totalErrorsCount: totalErrors,
        acceptanceRate: Number(acceptanceRate.toFixed(3))
      };
    } catch (err) {
      console.error("Error in AdaptiveExtractionTuner:", err);
      return {
        extractionType,
        recommendedThreshold: baseThreshold,
        totalErrorsCount: 0,
        acceptanceRate: 1.0
      };
    }
  }
}
