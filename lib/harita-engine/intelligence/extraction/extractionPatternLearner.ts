/**
 * Tracknov Extraction Feedback - Extraction Pattern Learner
 * Analyzes recurring correction sequences to propose normalization mappings prospectively.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface LearnedPatterns {
  recurringOcrMistakes: Record<string, string>;
  recurringAliases: Record<string, string>;
  totalAnalyzed: number;
}

export class ExtractionPatternLearner {
  /**
   * Scans correction data to identify systemic character or word replacement patterns.
   */
  public static async learnRecurringErrors(): Promise<LearnedPatterns> {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("extraction_corrections")
        .select("original_value, corrected_value, extraction_type")
        .limit(200);

      const recurringOcrMistakes: Record<string, string> = {};
      const recurringAliases: Record<string, string> = {};

      if (data) {
        for (const item of data) {
          const orig = (item.original_value || "").trim();
          const corr = (item.corrected_value || "").trim();

          if (orig === corr || !orig || !corr) continue;

          // OCR Typographical Capture
          if (item.extraction_type === "OCR" && orig.length < 15) {
            recurringOcrMistakes[orig] = corr;
          }

          // Supplier Alias Capture
          if (item.extraction_type === "TABLE" && (orig.toLowerCase().includes("daikin") || orig.toLowerCase().includes("carrier") || orig.toLowerCase().includes("trane"))) {
            recurringAliases[orig] = corr;
          }
        }
      }

      return {
        recurringOcrMistakes,
        recurringAliases,
        totalAnalyzed: data ? data.length : 0
      };
    } catch (err) {
      console.error("Error in ExtractionPatternLearner:", err);
      return {
        recurringOcrMistakes: {},
        recurringAliases: {},
        totalAnalyzed: 0
      };
    }
  }
}
