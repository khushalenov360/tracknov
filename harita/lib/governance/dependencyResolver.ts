/**
 * Resolves downstream graph relations across Tracknov entities.
 * Enforces cycle detection during traversal to maintain linear deterministic ordering.
 */
export interface DependencyNode {
  id: string;
  type: "document" | "credit" | "certification" | "export" | "override" | "replay_correction";
  parentId?: string;
}

export function resolveDependenciesRecursively(
  rootNode: DependencyNode,
  allNodes: DependencyNode[],
  visitedIds = new Set<string>(),
): DependencyNode[] {
  if (visitedIds.has(rootNode.id)) {
    // Cycle detected, stop traversal securely to prevent recursion hangs
    return [];
  }

  visitedIds.add(rootNode.id);
  const results: DependencyNode[] = [rootNode];

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
