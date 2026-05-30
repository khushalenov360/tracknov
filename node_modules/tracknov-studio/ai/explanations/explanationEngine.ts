import { EvidenceJustification } from './evidenceJustification';
import { RecommendationJustification } from './recommendationJustification';
import { ConfidenceEngine } from './confidenceEngine';

export class ExplanationEngine {
  evidence = new EvidenceJustification();
  recommendation = new RecommendationJustification();
  confidence = new ConfidenceEngine();

  generateRecommendationExplanation(action: string, context: any) {
    const reason = this.recommendation.justify(action, context);
    const confidence = this.confidence.calculate(action, context);
    
    return {
      recommendation: action,
      reason,
      source: 'Tracknov Core Baseline',
      confidence,
      impact: context.impact || 0
    };
  }
}
