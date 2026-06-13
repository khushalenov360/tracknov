export class RecommendationExplainer {
  public static explain(facts: any): string {
    if (!facts || !facts.highestImpact) {
      return "General recommendation: focus on missing mandatory documents first.";
    }

    return `Completing the ${facts.highestImpact.toLowerCase()} package is expected to provide the largest increase in readiness because it satisfies a major evidence dependency.`;
  }
}
