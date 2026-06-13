"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.traverseExecutionGraph = traverseExecutionGraph;
exports.getDeterministicExecutionOrder = getDeterministicExecutionOrder;
/**
 * Traverses the runtime execution graph to identify all nodes impacted by a change.
 */
function traverseExecutionGraph(startNodeId, graph) {
    const visited = new Set();
    const queue = [startNodeId];
    const impacted = [];
    while (queue.length > 0) {
        const currentId = queue.shift();
        if (visited.has(currentId))
            continue;
        visited.add(currentId);
        impacted.push(currentId);
        // Find nodes that depend on this node
        const dependents = graph.filter(node => node.dependencies.includes(currentId));
        for (const dep of dependents) {
            queue.push(dep.id);
        }
    }
    return impacted;
}
/**
 * Generates a deterministic execution order for a set of impacted nodes.
 */
function getDeterministicExecutionOrder(impactedNodes) {
    return [...impactedNodes].sort(); // Determinism through sorting
}
