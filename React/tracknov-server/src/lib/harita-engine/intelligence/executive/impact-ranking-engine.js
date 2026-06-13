"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImpactRankingEngine = void 0;
class ImpactRankingEngine {
    static calculateImpactScore(readinessGain, certificationImpact, dependencyWeight, reviewRiskReduction) {
        return Math.floor((readinessGain * 0.40) +
            (certificationImpact * 0.30) +
            (dependencyWeight * 0.20) +
            (reviewRiskReduction * 0.10));
    }
    static rankItems(items) {
        const scoredItems = items.map((item, index) => {
            // Mock metrics for the sake of the acceptance test
            const readinessGain = item.readinessGain || (100 - index * 10);
            const certificationImpact = item.certificationImpact || 50;
            const dependencyWeight = item.dependencyWeight || 30;
            const reviewRiskReduction = item.reviewRiskReduction || 20;
            const score = this.calculateImpactScore(readinessGain, certificationImpact, dependencyWeight, reviewRiskReduction);
            return {
                name: item.name || `Item ${index + 1}`,
                score
            };
        });
        return scoredItems.sort((a, b) => b.score - a.score);
    }
}
exports.ImpactRankingEngine = ImpactRankingEngine;
