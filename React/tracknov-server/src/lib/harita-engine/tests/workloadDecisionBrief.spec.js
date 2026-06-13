"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const workload_intelligence_engine_1 = require("../intelligence/workload/workload-intelligence-engine");
const executiveBriefPlanner_1 = require("../ai/planners/executiveBriefPlanner");
const vitest_1 = require("vitest");
(0, vitest_1.describe)('Workload Decision Brief Planner', () => {
    (0, vitest_1.it)('should generate a workload priority brief', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockContext = {
            credits: [
                { id: "c1", status: "BLOCKED" },
                { id: "c2", status: "BLOCKED" }
            ],
            profiles: {
                "user1": { full_name: "Architect" },
                "user2": { full_name: "Contractor" }
            },
            creditAssignmentGraph: new Map([
                ["c1", { assignments: [{ assigned_to: "user1" }, { assigned_to: "user1" }] }],
                ["c2", { assignments: [{ assigned_to: "user1" }] }]
            ])
        };
        const workloads = yield workload_intelligence_engine_1.WorkloadIntelligenceEngine.getContributorWorkloads("p1", mockContext);
        const mockReasoning = {
            evidence: JSON.stringify(workloads)
        };
        const brief = (0, executiveBriefPlanner_1.generateExecutiveBrief)(mockReasoning, "WORKLOAD");
        (0, vitest_1.expect)(brief.businessImpact[0]).toContain("predicted overload");
        (0, vitest_1.expect)(brief.recommendations[0]).toContain("Contractor");
    }));
});
