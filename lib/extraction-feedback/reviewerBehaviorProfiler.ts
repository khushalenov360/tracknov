/**
 * Tracknov Extraction Feedback - Reviewer Behavior Profiler
 * Models individual reviewer profiles and expected rigor levels.
 */

import { createAdminClient } from "../supabase/admin";

export interface ReviewerProfile {
  reviewerId: string;
  rigorLevel: "LENIENT" | "MODERATE" | "STRICT";
  correctionsSubmittedCount: number;
  simulatedAcceptanceRate: number;
}

export class ReviewerBehaviorProfiler {
  /**
   * Profiles a reviewer, classifying their rigor level and correction thresholds.
   */
  public static async profileReviewer(reviewerId: string): Promise<ReviewerProfile> {
    try {
      const supabase = createAdminClient();
      
      const { count } = await supabase
        .from("extraction_corrections")
        .select("*", { count: "exact", head: true })
        .eq("reviewer_id", reviewerId);

      const totalCorrections = count || 0;
      let rigorLevel: "LENIENT" | "MODERATE" | "STRICT" = "MODERATE";

      if (totalCorrections > 10) {
        rigorLevel = "STRICT";
      } else if (totalCorrections < 3) {
        rigorLevel = "LENIENT";
      }

      return {
        reviewerId,
        rigorLevel,
        correctionsSubmittedCount: totalCorrections,
        simulatedAcceptanceRate: Number(Math.max(0.65, 1.0 - (totalCorrections * 0.03)).toFixed(3))
      };
    } catch (err) {
      console.error("Error in ReviewerBehaviorProfiler:", err);
      return {
        reviewerId,
        rigorLevel: "MODERATE",
        correctionsSubmittedCount: 0,
        simulatedAcceptanceRate: 0.95
      };
    }
  }
}
