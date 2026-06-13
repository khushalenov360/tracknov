"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectCopilotEngine = void 0;
class ProjectCopilotEngine {
    static getDailyGuidance(projectId) {
        return {
            priorityTasks: [
                "Upload MR1 evidence",
                "Assign IEQ2 narrative",
                "Review EDA C1 drawings"
            ],
            potentialImpact: "+6 points"
        };
    }
}
exports.ProjectCopilotEngine = ProjectCopilotEngine;
