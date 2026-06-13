/**
 * Tracknov Document Intelligence - Evidence Readability Analyzer
 * Analyzes sentence length, word count distributions, and grammar/coherence flags.
 */

export interface ReadabilityMetrics {
  averageSentenceLength: number;
  longSentenceRatio: number;
  wordComplexityScore: number; // Percentage of multi-syllable or engineering jargon words
  readabilityScore: number; // Estimated readability index from 0 to 100
}

export class EvidenceReadabilityAnalyzer {
  /**
   * Computes clean readability metrics deterministically to ensure replay purity.
   */
  public static analyze(text: string): ReadabilityMetrics {
    if (!text || text.trim().length === 0) {
      return { averageSentenceLength: 0, longSentenceRatio: 0, wordComplexityScore: 0, readabilityScore: 0 };
    }

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.trim().length > 0);

    const averageSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
    
    // Sentences with more than 25 words are considered long in review documentation
    const longSentences = sentences.filter(s => s.split(/\s+/).filter(Boolean).length > 25).length;
    const longSentenceRatio = sentences.length > 0 ? longSentences / sentences.length : 0.0;

    // Words with more than 8 characters are considered complex/jargon
    const complexWords = words.filter(w => w.length > 8).length;
    const wordComplexityScore = words.length > 0 ? complexWords / words.length : 0.0;

    // Flesch-Kincaid readability estimate
    let readabilityScore = 100 - (averageSentenceLength * 1.015) - (wordComplexityScore * 84.6);
    readabilityScore = Math.max(0, Math.min(100, readabilityScore));
    readabilityScore = Math.round(readabilityScore * 100) / 100;

    return {
      averageSentenceLength: Math.round(averageSentenceLength * 10) / 10,
      longSentenceRatio: Math.round(longSentenceRatio * 100) / 100,
      wordComplexityScore: Math.round(wordComplexityScore * 100) / 100,
      readabilityScore,
    };
  }
}
