"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const executiveBriefPlanner_1 = require("../ai/planners/executiveBriefPlanner");
const vitest_1 = require("vitest");
(0, vitest_1.describe)('Executive Brief Planner', () => {
    (0, vitest_1.it)('should generate an executive priority brief', () => {
        const mockReasoning = {
            evidence: JSON.stringify([{
                    title: "Resubmit EDA C1 rejected evidence",
                    owner: "Architect",
                    urgency: 100,
                    rationale: "This rejection is currently blocking certification progress and preventing stage advancement."
                }])
        };
        const brief = (0, executiveBriefPlanner_1.generateExecutiveBrief)(mockReasoning, "EXECUTIVE_PRIORITY");
        (0, vitest_1.expect)(brief.primaryAction.title).toContain("Resubmit");
        (0, vitest_1.expect)(brief.primaryAction.owner).toBe("Architect");
        (0, vitest_1.expect)(brief.businessImpact.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(brief.recommendations.length).toBeGreaterThan(0);
    });
});
