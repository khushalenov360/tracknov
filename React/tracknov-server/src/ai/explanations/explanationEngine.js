"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExplanationEngine = void 0;
const evidenceJustification_1 = require("./evidenceJustification");
const recommendationJustification_1 = require("./recommendationJustification");
const confidenceEngine_1 = require("./confidenceEngine");
class ExplanationEngine {
    constructor() {
        this.evidence = new evidenceJustification_1.EvidenceJustification();
        this.recommendation = new recommendationJustification_1.RecommendationJustification();
        this.confidence = new confidenceEngine_1.ConfidenceEngine();
    }
    generateRecommendationExplanation(action, context) {
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
exports.ExplanationEngine = ExplanationEngine;
