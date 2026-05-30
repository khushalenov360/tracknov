/**
 * Tracknov Knowledge Governance - Knowledge Influence Graph
 * Calculates influence percentages of individual corrections on retrieval models.
 */

export interface InfluenceEdge {
  correctionId: string;
  influencePercentage: number;
  direction: string;
}

export class KnowledgeInfluenceGraph {
  /**
   * Estimates model change weight from edit size.
   */
  public static calculateInfluence(
    editDistance: number,
    confidencePenalty: number
  ): InfluenceEdge {
    const influence = Math.min((editDistance * 5.0) + (confidencePenalty * 50.0), 99.0);

    return {
      correctionId: `corr-${Math.random().toString(36).substr(2, 9)}`,
      influencePercentage: Number(influence.toFixed(1)),
      direction: "PROSPECTIVE_TUNING"
    };
  }
}
