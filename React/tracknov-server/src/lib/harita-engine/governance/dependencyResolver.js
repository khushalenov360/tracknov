"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDependenciesRecursively = resolveDependenciesRecursively;
function resolveDependenciesRecursively(rootNode, allNodes, visitedIds = new Set()) {
    if (visitedIds.has(rootNode.id)) {
        // Cycle detected, stop traversal securely to prevent recursion hangs
        return [];
    }
    visitedIds.add(rootNode.id);
    const results = [rootNode];
    // Find immediate children based on defined relationship edges
    const children = allNodes.filter((node) => node.parentId === rootNode.id);
    // Maintain deterministic propagation ordering by sorting child IDs
    children.sort((a, b) => a.id.localeCompare(b.id));
    for (const child of children) {
        const downstream = resolveDependenciesRecursively(child, allNodes, visitedIds);
        results.push(...downstream);
    }
    return results;
}
