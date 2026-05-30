export interface SemanticMatchResult {
  similarityScore: number; // 0 to 1
  matchedKeywords: string[];
  frameworkMismatch: boolean;
}

export class EvidenceSemanticMatcher {
  /**
   * Estimates match confidence using cosine-inspired vector simulations on query and submittal properties
   */
  static match(query: string, textExcerpt: string, allowedFrameworks: string[]): SemanticMatchResult {
    const queryWords = (query.toLowerCase().match(/\b\w+\b/g) || []) as string[];
    const textWords = (textExcerpt.toLowerCase().match(/\b\w+\b/g) || []) as string[];
    
    // Find intersection keywords
    const matchedKeywords = queryWords.filter((word) => textWords.includes(word));
    
    // Compute basic keyword intersection score
    let similarityScore = 0.0;
    if (queryWords.length > 0) {
      similarityScore = matchedKeywords.length / queryWords.length;
    }
    
    // Set minimal baseline for partial matches to simulate semantic context
    if (similarityScore > 0) {
      similarityScore = Math.min(0.99, parseFloat((similarityScore * 0.8 + 0.15).toFixed(2)));
    } else {
      similarityScore = 0.05;
    }

    // Verify framework compatibility
    const hasSharedFramework = allowedFrameworks.some(
      (f) => textExcerpt.toLowerCase().includes(f.toLowerCase()) || query.toLowerCase().includes(f.toLowerCase())
    );

    return {
      similarityScore,
      matchedKeywords,
      frameworkMismatch: !hasSharedFramework && allowedFrameworks.length > 0,
    };
  }
}
