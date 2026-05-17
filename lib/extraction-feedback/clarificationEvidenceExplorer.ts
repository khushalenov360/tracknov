/**
 * Tracknov Extraction Feedback - Clarification Evidence Explorer
 * Provides granular mapping explaining exactly why a clarification was drafted.
 */

export interface ClarificationReason {
  reason: string;
  missingItems: string[];
  recommendedResolutions: string[];
}

export class ClarificationEvidenceExplorer {
  /**
   * Generates explainer object for clarification template triggers.
   */
  public static exploreGaps(
    missingItems: string[],
    existingEvidence: string[],
    auditorRigor: string
  ): ClarificationReason {
    const missing = missingItems.join(", ");
    const existing = existingEvidence.length > 0 ? existingEvidence.join(", ") : "No prior submittals";
    
    const reason = `Clarification drafted under ${auditorRigor} auditor rigor. Required items [${missing}] were not found in current upload. Verified assets found: [${existing}].`;

    const recommendedResolutions = missingItems.map(item => `Please upload certified ${item} documents.`);

    return {
      reason,
      missingItems,
      recommendedResolutions
    };
  }
}
