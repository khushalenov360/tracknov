"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContributorPrioritizationEngine = void 0;
class ContributorPrioritizationEngine {
    static getBriefForRole(role, context) {
        // In production, this would calculate actual workload, not base it on PDFs
        return {
            role: role,
            openTasks: 5,
            blockedTasks: 1,
            rejectedTasks: 0,
            highestImpactTask: "EDA C1 Calculation",
            expectedGain: "+30"
        };
    }
}
exports.ContributorPrioritizationEngine = ContributorPrioritizationEngine;
