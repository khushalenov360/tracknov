import { CertificationKnowledgeGraph, GraphNode } from './graphBuilder';

export function findDependencies(graph: CertificationKnowledgeGraph, nodeId: string): GraphNode[] {
  const dependencies: GraphNode[] = [];
  const visited = new Set<string>();

  function traverse(currentId: string) {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    const outEdges = graph.getEdgesFrom(currentId).filter(e => e.relationship === 'depends_on');
    for (const edge of outEdges) {
      const targetNode = graph.getNode(edge.target);
      if (targetNode) {
        dependencies.push(targetNode);
        traverse(targetNode.id);
      }
    }
  }

  traverse(nodeId);
  return dependencies;
}

export function findDependents(graph: CertificationKnowledgeGraph, nodeId: string): GraphNode[] {
  const dependents: GraphNode[] = [];
  const visited = new Set<string>();

  function traverse(currentId: string) {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    const inEdges = graph.getEdgesTo(currentId).filter(e => e.relationship === 'depends_on');
    for (const edge of inEdges) {
      const sourceNode = graph.getNode(edge.source);
      if (sourceNode) {
        dependents.push(sourceNode);
        traverse(sourceNode.id);
      }
    }
  }

  traverse(nodeId);
  return dependents;
}
