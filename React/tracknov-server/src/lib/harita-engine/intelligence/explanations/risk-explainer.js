"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskExplainer = void 0;
class RiskExplainer {
    static explain(facts) {
        if (!facts || facts.completion === undefined) {
            return "Risk analysis unavailable due to missing completion metrics.";
        }
        if (facts.completion < 25) {
            return "The credit is at elevated submission risk because progress remains significantly below readiness thresholds.";
        }
        else if (facts.completion < 75) {
            return "The credit is at moderate risk due to pending documentation requirements.";
        }
        return "The credit has low risk as it approaches readiness thresholds.";
    }
}
exports.RiskExplainer = RiskExplainer;
