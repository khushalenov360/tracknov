/**
 * Tracknov Extraction Feedback - Duplicate Reasoning Viewer
 * Formulates detailed textual explanations of detected submittal duplication weights.
 */

export class DuplicateReasoningViewer {
  /**
   * Generates a descriptive narrative regarding duplicate warning reasoning.
   */
  public static getDuplicateReason(
    overlapRatio: number,
    matchedDocuments: string[],
    matchedParameters: string[]
  ): string {
    const percentage = (overlapRatio * 100).toFixed(0);
    const docs = matchedDocuments.join(", ");
    const params = matchedParameters.join(", ");

    return `Duplicate Evidence Warning with ${percentage}% semantic overlap matched against [${docs}]. Overlaps detected on parameters [${params}].`;
  }
}
