import { CertificationKnowledgeGraph, GraphNode } from './graphBuilder';

export function traverseGraph(
  graph: CertificationKnowledgeGraph,
  startNodeId: string,
  onVisit: (node: GraphNode, path: string[]) => void
) {
  const visited = new Set<string>();

  function dfs(currentId: string, path: string[]) {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    const node = graph.getNode(currentId);
    if (node) {
      onVisit(node, path);
      
      const edges = graph.getEdgesFrom(currentId);
      for (const edge of edges) {
        dfs(edge.target, [...path, currentId]);
      }
    }
  }

  dfs(startNodeId, []);
}
