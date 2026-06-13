"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExplanationEngine = void 0;
const assignment_explainer_1 = require("./assignment-explainer");
const blocker_explainer_1 = require("./blocker-explainer");
const risk_explainer_1 = require("./risk-explainer");
const recommendation_explainer_1 = require("./recommendation-explainer");
class ExplanationEngine {
    static explainAssignment(facts) {
        return assignment_explainer_1.AssignmentExplainer.explain(facts);
    }
    static explainBlocker(facts) {
        return blocker_explainer_1.BlockerExplainer.explain(facts);
    }
    static explainRisk(facts) {
        return risk_explainer_1.RiskExplainer.explain(facts);
    }
    static explainRecommendation(facts) {
        return recommendation_explainer_1.RecommendationExplainer.explain(facts);
    }
}
exports.ExplanationEngine = ExplanationEngine;
