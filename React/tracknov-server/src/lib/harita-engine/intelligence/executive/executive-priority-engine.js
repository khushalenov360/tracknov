"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutivePriorityEngine = void 0;
class ExecutivePriorityEngine {
    static getPriority(questionType, context) {
        switch (questionType) {
            case "NEXT_ACTION":
                return {
                    action: "Resolve EDA C1 clarification",
                    impact: "+25 readiness",
                    owner: "Architect",
                    reason: "Unblocks approval workflow"
                };
            case "BIGGEST_RISK":
                return {
                    action: "Missing Energy Simulation",
                    impact: "-15 certification points",
                    owner: "Energy Modeler",
                    reason: "High dependency for 3 other credits."
                };
            case "HIGHEST_IMPACT_TASK":
            case "TOP_5_ACTIONS":
            default:
                return [
                    {
                        action: "Upload Water Calculations",
                        impact: "+20 readiness",
                        owner: "Plumbing Engineer",
                        reason: "Addresses reviewer comments."
                    }
                ];
        }
    }
}
exports.ExecutivePriorityEngine = ExecutivePriorityEngine;
