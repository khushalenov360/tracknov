"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectIntelligenceEngine = void 0;
class ProjectIntelligenceEngine {
    static analyzeProjectHealth(context) {
        if (!context.project)
            return { health: "UNKNOWN", message: "No active project" };
        const total = context.credits.length;
        if (total === 0)
            return { health: "GOOD", message: "No credits tracked." };
        const approved = context.credits.filter(c => c.status === "APPROVED" || c.status === "complete").length;
        const progress = (approved / total) * 100;
        const blocked = context.credits.filter(c => c.status === "BLOCKED");
        return {
            health: blocked.length > 0 ? "AT_RISK" : (progress > 50 ? "GOOD" : "NEEDS_ATTENTION"),
            blockedCredits: blocked.map(c => c.credit_code),
            completionRate: progress
        };
    }
}
exports.ProjectIntelligenceEngine = ProjectIntelligenceEngine;
