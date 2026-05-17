/**
 * Tracknov Knowledge Governance - Ontology Instability Analyzer
 * Ranks taxonomy nodes based on override frequencies to flag unstable definitions.
 */

export interface InstabilityMetrics {
  conceptCode: string;
  overrideCount: number;
  instabilityIndex: number; // 0 (stable) to 1 (highly volatile)
  reconciliationProposed: boolean;
}

export class OntologyInstabilityAnalyzer {
  /**
   * Analyzes Concept usage volatility from override logs.
   */
  public static analyzeConcept(
    conceptCode: string,
    overrideCount: number,
    totalIngested: number
  ): InstabilityMetrics {
    if (totalIngested === 0) {
      return { conceptCode, overrideCount: 0, instabilityIndex: 0, reconciliationProposed: false };
    }

    const ratio = overrideCount / totalIngested;
    const instabilityIndex = Math.min(ratio * 2.0, 1.0); // weighted index scale
    const reconciliationProposed = instabilityIndex > 0.6;

    return {
      conceptCode,
      overrideCount,
      instabilityIndex,
      reconciliationProposed
    };
  }
}
