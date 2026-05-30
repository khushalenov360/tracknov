/**
 * Tracknov Extraction Feedback - AI Reasoning Explainer
 * Explains AI recommendations using structured matching indices and trace identifiers.
 */

export interface ReasoningExplanation {
  explanation: string;
  matchedKeywords: string[];
  evidenceQualityScore: number;
}

export class AiReasoningExplainer {
  /**
   * Generates a human-friendly narrative explaining the AI's credit recommendation logic.
   */
  public static explain(
    creditCode: string,
    semanticCategory: string,
    matchedSnippets: string[],
    qualityScore: number
  ): ReasoningExplanation {
    const matchedKeywords: string[] = [];
    const lowerSnippets = matchedSnippets.map(s => s.toLowerCase());

    const keywords = ["cop", "chiller", "lighting", "efficiency", "lpd", "gpm", "mechanical", "simulation"];
    for (const kw of keywords) {
      if (lowerSnippets.some(s => s.includes(kw))) {
        matchedKeywords.push(kw.toUpperCase());
      }
    }

    const matchedKeywordsStr = matchedKeywords.length > 0 ? matchedKeywords.join(", ") : "NONE";
    const explanation = `Matched Credit [${creditCode}] under framework domain [${semanticCategory}]. Matches detected on parameters [${matchedKeywordsStr}] with an overall evidence source quality rating of ${(qualityScore * 100).toFixed(0)}%.`;

    return {
      explanation,
      matchedKeywords,
      evidenceQualityScore: qualityScore
    };
  }
}
