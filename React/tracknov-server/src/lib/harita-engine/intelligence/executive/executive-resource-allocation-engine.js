"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutiveResourceAllocationEngine = void 0;
class ExecutiveResourceAllocationEngine {
    static allocateResources(context) {
        const allocations = [];
        // Evaluate the graph to find high-impact tasks
        const nodes = context.graph.evaluateGraph();
        const tasks = nodes.filter(n => n.type === 'task');
        for (const taskNode of tasks) {
            if (allocations.length >= 5)
                break; // Limit allocations
            const impactValue = taskNode.impact;
            const rationale = context.blockedCredits.includes(taskNode.dependencies[0])
                ? `Unblocks dependent credits. Provides +${impactValue} readiness.`
                : `Provides +${impactValue} readiness.`;
            const effort = "2 hrs"; // Ideally this would come from the task model itself
            allocations.push({
                contributor: taskNode.owners[0] || "Unassigned",
                task: taskNode.entityId, // In production, map this back to task description
                impact: `+${impactValue} readiness`,
                effort: effort,
                rationale: rationale
            });
        }
        return allocations;
    }
}
exports.ExecutiveResourceAllocationEngine = ExecutiveResourceAllocationEngine;
