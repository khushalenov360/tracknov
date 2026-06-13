"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const certification_strategy_engine_1 = require("../services/certification-strategy-engine");
(0, vitest_1.describe)('Certification Strategy Engine', () => {
    (0, vitest_1.it)('should calculate high ROI credits correctly', () => {
        const mockCredits = [
            { credit_code: 'A', state: 'pending', max_points: 10, probability: 0.9 }, // ROI: 9
            { credit_code: 'B', state: 'pending', max_points: 5, probability: 0.5 }, // ROI: 2.5
            { credit_code: 'C', state: 'pending', max_points: 20, probability: 0.8 } // ROI: 16
        ];
        const strategy = certification_strategy_engine_1.certificationStrategyEngine.getStrategy(mockCredits);
        (0, vitest_1.expect)(strategy.highRoiCredits).toBeDefined();
        (0, vitest_1.expect)(strategy.highRoiCredits[0].credit).toBe('C');
        (0, vitest_1.expect)(strategy.highRoiCredits[1].credit).toBe('A');
    });
});
