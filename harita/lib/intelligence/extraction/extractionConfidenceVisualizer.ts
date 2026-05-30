/**
 * Tracknov Extraction Feedback - Extraction Confidence Visualizer
 * Maps numerical confidence scores to standard compliance labels.
 */

export interface ConfidenceBadge {
  label: string;
  color: string; // Tailwind-friendly or theme-friendly class name
  trustRating: "EXCELLENT" | "RELIABLE" | "UNRELIABLE";
}

export class ExtractionConfidenceVisualizer {
  /**
   * Translates confidence score to standard UI badges and warnings.
   */
  public static getConfidenceBadge(score: number): ConfidenceBadge {
    if (score >= 0.92) {
      return {
        label: "HIGH CONFIDENCE",
        color: "emerald",
        trustRating: "EXCELLENT"
      };
    }
    if (score >= 0.75) {
      return {
        label: "MODERATE CONFIDENCE",
        color: "amber",
        trustRating: "RELIABLE"
      };
    }
    return {
      label: "LOW QUALITY",
      color: "rose",
      trustRating: "UNRELIABLE"
    };
  }
}
