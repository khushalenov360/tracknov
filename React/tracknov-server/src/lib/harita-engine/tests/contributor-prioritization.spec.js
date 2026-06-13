"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const contributor_prioritization_engine_1 = require("../intelligence/contributor/contributor-prioritization-engine");
(0, vitest_1.describe)('Contributor Prioritization Engine', () => {
    (0, vitest_1.it)('should return strict contributor copiloting profile', () => {
        const brief = contributor_prioritization_engine_1.ContributorPrioritizationEngine.getBriefForRole('Architect', {});
        (0, vitest_1.expect)(brief.role).toBe('Architect');
        (0, vitest_1.expect)(brief).toHaveProperty('openTasks');
        (0, vitest_1.expect)(brief).toHaveProperty('blockedTasks');
        (0, vitest_1.expect)(brief).toHaveProperty('highestImpactTask');
        (0, vitest_1.expect)(brief).toHaveProperty('expectedGain');
    });
});
