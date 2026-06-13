/**
 * Tracknov Intelligence Core - Confidence & Quality Scoring Engine
 * Single, authoritative source of truth for intelligence heuristic evaluations.
 */

export class ConfidenceEngine {
  /**
   * Computes a normalized confidence score [0..1] for data extractions.
   */
  public static calculateExtractionConfidence(
    matchedTerms: number,
    totalTerms: number,
    ocrQuality: number
  ): number {
    if (totalTerms <= 0) return 0.0;
    const termRatio = matchedTerms / totalTerms;
    const confidence = (termRatio * 0.7) + (ocrQuality * 0.3);
    return Math.max(0.0, Math.min(1.0, Math.round(confidence * 1000) / 1000));
  }

  /**
   * Calculates retrieval confidence based on cosine similarity and origin document status.
   */
  public static calculateRetrievalConfidence(
    similarityScore: number,
    documentState: string
  ): number {
    let penalty = 0.0;
    if (documentState === "REJECTED") penalty = 0.15;
    if (documentState === "DRAFT") penalty = 0.05;

    const rawScore = similarityScore - penalty;
    return Math.max(0.0, Math.min(1.0, Math.round(rawScore * 1000) / 1000));
  }

  /**
   * Computes recommendation confidence for credit reuses and matching pipelines.
   */
  public static calculateRecommendationConfidence(
    matchRate: number,
    relevanceWeight: number
  ): number {
    const rawScore = (matchRate * 0.6) + (relevanceWeight * 0.4);
    return Math.max(0.0, Math.min(1.0, Math.round(rawScore * 1000) / 1000));
  }

  /**
   * Analyzes copy-paste duplicate certainty.
   */
  public static calculateDuplicateCertainty(
    similarityScore: number,
    wordCountRatio: number
  ): number {
    if (similarityScore > 0.98) return 1.0;
    const rawScore = (similarityScore * 0.8) + (wordCountRatio * 0.2);
    return Math.max(0.0, Math.min(1.0, Math.round(rawScore * 1000) / 1000));
  }

  /**
   * Computes quality scoring for AI clarifications.
   */
  public static calculateClarificationQuality(
    completeness: number,
    semanticClarity: number
  ): number {
    const rawScore = (completeness * 0.5) + (semanticClarity * 0.5);
    return Math.max(0.0, Math.min(1.0, Math.round(rawScore * 1000) / 1000));
  }
}
