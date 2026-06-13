"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const clarification_resolution_engine_1 = require("../intelligence/clarification/clarification-resolution-engine");
(0, vitest_1.describe)('Clarification Resolution Engine', () => {
    (0, vitest_1.it)('should resolve a clarification with strict structure', () => {
        const resolution = clarification_resolution_engine_1.ClarificationResolutionEngine.resolveClarification({
            query: "Please provide tank capacity details.",
            projectData: {},
            creditDetails: {}
        });
        (0, vitest_1.expect)(resolution).toHaveProperty('rootCause');
        (0, vitest_1.expect)(resolution).toHaveProperty('affectedCriteria');
        (0, vitest_1.expect)(resolution).toHaveProperty('missingEvidence');
        (0, vitest_1.expect)(resolution).toHaveProperty('recommendedResponse');
        (0, vitest_1.expect)(resolution).toHaveProperty('acceptanceProbability');
    });
});
