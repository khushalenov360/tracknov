/**
 * Tracknov Document Intelligence - Reviewer Reasoning Extractor
 * Identifies historical decision-making rationales to maintain review consistency.
 */

export interface ReasoningProfile {
  focusArea: string;
  rigorLevel: "STRICT" | "STANDARD" | "RELAXED";
  keyPrecedents: string[];
}

export class ReviewerReasoningExtractor {
  /**
   * Models the auditing paradigm and expectations for a specific credit category.
   */
  public static extractProfile(category: string): ReasoningProfile {
    const normCategory = category.toUpperCase();

    if (normCategory === "ENERGY_EFFICIENCY") {
      return {
        focusArea: "HVAC COP and baseline building performance modeling verification",
        rigorLevel: "STRICT",
        keyPrecedents: [
          "Always require manufacturer datasheets for any HVAC systems > 50TR.",
          "Verify that baseline fan power conforms strictly to ASHRAE 90.1 Appendix G.",
        ],
      };
    }

    if (normCategory === "SUSTAINABLE_MATERIALS") {
      return {
        focusArea: "Recycled content percentages and manufacturer invoice traceability",
        rigorLevel: "STANDARD",
        keyPrecedents: [
          "Check that EPD declarations are within their 5-year validity period.",
          "Ensure total cost of regional materials is calculated using standard formulas.",
        ],
      };
    }

    return {
      focusArea: "General documentation completeness and compliance tags matching",
      rigorLevel: "STANDARD",
      keyPrecedents: ["Verify credentials of signing architects and engineers."],
    };
  }
}
