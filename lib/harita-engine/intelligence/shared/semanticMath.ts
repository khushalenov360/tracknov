/**
 * Tracknov Intelligence Core - Semantic Math Library
 * Centralized, pure vector math and similarity calculations for semantic search and duplicate detection.
 */

export class SemanticMath {
  /**
   * Calculates the cosine similarity between two numeric vectors.
   */
  public static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA.length || !vecB.length || vecA.length !== vecB.length) {
      return -1.0;
    }

    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (!normA || !normB) {
      return -1.0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Compares two high-dimensional embeddings and returns a normalized similarity score.
   */
  public static compareEmbeddings(a: number[], b: number[]): number {
    const similarity = this.cosineSimilarity(a, b);
    return Math.round(similarity * 10000) / 10000;
  }

  /**
   * Sorts and ranks candidates according to their semantic similarity to a query vector.
   */
  public static semanticRanking<T>(
    queryVector: number[],
    candidates: T[],
    vectorExtractor: (item: T) => number[]
  ): Array<T & { score: number }> {
    return candidates
      .map((candidate) => {
        const vector = vectorExtractor(candidate);
        const similarity = this.cosineSimilarity(queryVector, vector);
        return {
          ...candidate,
          score: Math.round(similarity * 1000) / 1000,
        };
      })
      .filter((item) => Number.isFinite(item.score))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Authoritative duplication evaluation based on a hard governance threshold.
   */
  public static isDuplicateEvidence(similarity: number, threshold: number = 0.95): boolean {
    return similarity > threshold;
  }
}
