"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const igbc_narrative_engine_1 = require("../intelligence/narrative/igbc-narrative-engine");
(0, vitest_1.describe)('Narrative Quality Engine', () => {
    (0, vitest_1.it)('should generate an IGBC structured narrative', () => {
        const inputs = {
            creditRequirements: "Provide 15% energy efficiency",
            reviewCriteria: "Show energy modeling report",
            uploadedEvidence: ["energy-model.pdf"],
            projectContext: "Office building in Indore"
        };
        const narrative = igbc_narrative_engine_1.IgbcNarrativeEngine.generateNarrative(inputs);
        (0, vitest_1.expect)(narrative).toHaveProperty('intent');
        (0, vitest_1.expect)(narrative).toHaveProperty('projectCompliance');
        (0, vitest_1.expect)(narrative).toHaveProperty('evidenceSummary');
        (0, vitest_1.expect)(narrative).toHaveProperty('designStrategy');
        (0, vitest_1.expect)(narrative).toHaveProperty('conclusion');
    });
    (0, vitest_1.it)('should throw error if evidence is missing', () => {
        (0, vitest_1.expect)(() => {
            igbc_narrative_engine_1.IgbcNarrativeEngine.generateNarrative({
                creditRequirements: "Provide 15% energy efficiency",
                reviewCriteria: "Show energy modeling report",
                uploadedEvidence: [],
                projectContext: "Office building in Indore"
            });
        }).toThrow();
    });
});
