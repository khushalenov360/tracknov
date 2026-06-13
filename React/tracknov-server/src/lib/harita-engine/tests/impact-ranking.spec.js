"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const impact_ranking_engine_1 = require("../intelligence/executive/impact-ranking-engine");
(0, vitest_1.describe)('Impact Ranking Engine', () => {
    (0, vitest_1.it)('should calculate impact score accurately based on strict formula', () => {
        // Formula: (readinessGain * 0.40) + (certificationImpact * 0.30) + (dependencyWeight * 0.20) + (reviewRiskReduction * 0.10)
        const score = impact_ranking_engine_1.ImpactRankingEngine.calculateImpactScore(100, 50, 30, 20);
        // (100 * 0.4) + (50 * 0.3) + (30 * 0.2) + (20 * 0.1)
        // 40 + 15 + 6 + 2 = 63
        (0, vitest_1.expect)(score).toBe(63);
    });
    (0, vitest_1.it)('should rank items by score descending', () => {
        const items = [
            { name: 'Low Impact', readinessGain: 10, certificationImpact: 10, dependencyWeight: 10, reviewRiskReduction: 10 },
            { name: 'High Impact', readinessGain: 100, certificationImpact: 100, dependencyWeight: 100, reviewRiskReduction: 100 }
        ];
        const ranked = impact_ranking_engine_1.ImpactRankingEngine.rankItems(items);
        (0, vitest_1.expect)(ranked[0].name).toBe('High Impact');
        (0, vitest_1.expect)(ranked[1].name).toBe('Low Impact');
    });
});
