"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutiveDecisionEngine = void 0;
class ExecutiveDecisionEngine {
    static determineQuestionType(question) {
        const q = question.toLowerCase();
        if (q.includes("resource") || q.includes("allocate") || q.includes("who should")) {
            return "RESOURCE_ALLOCATION";
        }
        if (q.includes("week") || q.includes("top 5")) {
            return "WEEKLY_ACTIONS";
        }
        return "EXECUTIVE_PRIORITY";
    }
    static getExecutivePriority(projectState) {
        return {
            action: "Upload core compliance documents for Energy Performance",
            expectedImpact: 85,
            readinessGain: 20,
            certificationGain: 15,
            owner: "Energy Modeler",
            rationale: "Energy modeling results block 3 other credits and account for 15% of the total certification score."
        };
    }
    static getResourceAllocation(projectState) {
        return [
            {
                contributor: "Sustainability Consultant",
                recommendedWork: "Review pending Water Efficiency documents",
                impact: 70,
                effort: 2,
            },
            {
                contributor: "MEP Engineer",
                recommendedWork: "Upload HVAC commissioning reports",
                impact: 90,
                effort: 4,
            }
        ];
    }
    static getWeeklyActions(projectState) {
        return [
            {
                rank: 1,
                action: "Finalize Energy Model",
                impact: 95,
                dependenciesCleared: ["EA C1", "EA C2", "EA C3"]
            },
            {
                rank: 2,
                action: "Submit Water Calculations",
                impact: 80,
                dependenciesCleared: ["WE C1"]
            }
        ];
    }
    static answerExecutiveQuestion(question, projectState) {
        const type = this.determineQuestionType(question);
        switch (type) {
            case "EXECUTIVE_PRIORITY":
                return this.getExecutivePriority(projectState);
            case "RESOURCE_ALLOCATION":
                return this.getResourceAllocation(projectState);
            case "WEEKLY_ACTIONS":
                return this.getWeeklyActions(projectState);
        }
    }
}
exports.ExecutiveDecisionEngine = ExecutiveDecisionEngine;
