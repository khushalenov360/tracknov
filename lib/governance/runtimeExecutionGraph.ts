export interface GraphNode {
  id: string;
  type: string;
  dependencies: string[];
}

/**
 * Traverses the runtime execution graph to identify all nodes impacted by a change.
 */
export function traverseExecutionGraph(
  startNodeId: string,
  graph: GraphNode[]
): string[] {
  const visited = new Set<string>();
  const queue = [startNodeId];
  const impacted: string[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;

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
export function getDeterministicExecutionOrder(impactedNodes: string[]): string[] {
  return [...impactedNodes].sort(); // Determinism through sorting
}
