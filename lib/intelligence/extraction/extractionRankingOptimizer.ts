/**
 * Tracknov Extraction Feedback - Extraction Ranking Optimizer
 * Optimizes semantic retrieval ranking using override and correction logs.
 */

export interface CandidateDocument {
  documentId: string;
  score: number;
}

export class ExtractionRankingOptimizer {
  /**
   * Adjusts retrieval scores based on historic reliability overrides.
   */
  public static rerank(
    candidates: CandidateDocument[],
    overriddenDocIds: Set<string>
  ): CandidateDocument[] {
    return candidates
      .map(doc => {
        let score = doc.score;
        
        // Penalize retrieved segments from documents that historically incurred corrections
        if (overriddenDocIds.has(doc.documentId)) {
          score -= 0.12;
        }

        return {
          documentId: doc.documentId,
          score: Number(score.toFixed(3))
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}
