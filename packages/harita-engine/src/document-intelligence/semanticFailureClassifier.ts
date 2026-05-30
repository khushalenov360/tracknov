/**
 * Tracknov Extraction Feedback - Semantic Failure Classifier
 * Categorizes the root cause of an extraction anomaly.
 */

import { DiffMetrics } from "./reviewerCorrectionDiffEngine";

export type FailureType =
  | "OCR_NOISE"
  | "TABLE_FRAGMENTATION"
  | "WRONG_SEMANTIC_TAG"
  | "DUPLICATE_FALSE_POSITIVE"
  | "CLARIFICATION_HALLUCINATION"
  | "UNIT_MISREAD"
  | "MULTI_PAGE_MERGE_FAILURE"
  | "MANUFACTURER_CONFUSION";

export class SemanticFailureClassifier {
  /**
   * Evaluates text values and diff metrics to classify the correction reason.
   */
  public static classify(
    extractionType: string,
    original: string,
    corrected: string,
    diff: DiffMetrics
  ): FailureType {
    const origLower = (original || "").toLowerCase();
    const corrLower = (corrected || "").toLowerCase();

    // 1. Clarification check
    if (extractionType === "CLARIFICATION") {
      return "CLARIFICATION_HALLUCINATION";
    }

    // 2. Duplicate Detection overrides
    if (extractionType === "DUPLICATE_DETECTION") {
      return "DUPLICATE_FALSE_POSITIVE";
    }

    // 3. Semantic Tag edits
    if (extractionType === "SEMANTIC_TAG") {
      return "WRONG_SEMANTIC_TAG";
    }

    // 4. Unit misread check
    if (diff.numericChangeDetected) {
      const unitKeywords = ["cop", "kw", "tr", "gpm", "flow", "lpd", "efficiency", "btu"];
      if (unitKeywords.some(u => origLower.includes(u) || corrLower.includes(u))) {
        return "UNIT_MISREAD";
      }
    }

    // 5. Table fragmentation / merge issues
    if (origLower.includes("|") || origLower.includes("---") || corrLower.includes("|")) {
      if (origLower.includes("page") || corrLower.includes("page")) {
        return "MULTI_PAGE_MERGE_FAILURE";
      }
      return "TABLE_FRAGMENTATION";
    }

    // 6. Manufacturer checks
    const manufacturerKeywords = ["daikin", "carrier", "trane", "siemens", "honeywell", "johnson", "blue star", "lg", "voltas"];
    if (manufacturerKeywords.some(m => origLower.includes(m) || corrLower.includes(m))) {
      return "MANUFACTURER_CONFUSION";
    }

    // 7. OCR scanner noise character checks
    const ocrNoisePatterns = ["1ll", "o0", "c02", "ﬁ", "ﬂ", "|", "vv", "rn"];
    if (ocrNoisePatterns.some(pat => origLower.includes(pat))) {
      return "OCR_NOISE";
    }

    // Default fallbacks based on type
    if (extractionType === "TABLE") {
      return "TABLE_FRAGMENTATION";
    }

    return "OCR_NOISE";
  }
}
