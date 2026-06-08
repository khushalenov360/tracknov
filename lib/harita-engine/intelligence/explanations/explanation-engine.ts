import { AssignmentExplainer } from "./assignment-explainer";
import { BlockerExplainer } from "./blocker-explainer";
import { RiskExplainer } from "./risk-explainer";
import { RecommendationExplainer } from "./recommendation-explainer";

export class ExplanationEngine {
  public static explainAssignment(facts: any): string {
    return AssignmentExplainer.explain(facts);
  }

  public static explainBlocker(facts: any): string {
    return BlockerExplainer.explain(facts);
  }

  public static explainRisk(facts: any): string {
    return RiskExplainer.explain(facts);
  }

  public static explainRecommendation(facts: any): string {
    return RecommendationExplainer.explain(facts);
  }
}
