/**
 * Tracknov Intelligence Certification - Semantic Performance Comparator
 * Compares semantic accuracy parameters between old and new model states.
 */

export interface PerformanceDelta {
  scoreA: number;
  scoreB: number;
  delta: number;
  improving: boolean;
}

export class SemanticPerformanceComparator {
  /**
   * Compares two scores and flags improvements.
   */
  public static compare(scoreA: number, scoreB: number): PerformanceDelta {
    const delta = scoreB - scoreA;
    return {
      scoreA,
      scoreB,
      delta,
      improving: delta >= 0.0
    };
  }
}
