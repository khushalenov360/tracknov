import { CertificationKnowledgeGraph, GraphNode } from './graphBuilder';

export function findReusableEvidence(graph: CertificationKnowledgeGraph, creditId: string): GraphNode[] {
  const reusableEvidence: GraphNode[] = [];
  
  // Find evidence that belongs to other credits but matches patterns or requirements for this credit
  // In a real implementation, this would cross-reference Document Categories and extracted metadata.
  const creditNode = graph.getNode(creditId);
  if (!creditNode) return [];

  // Get all evidence nodes in graph
  for (const [id, node] of graph.nodes.entries()) {
    if (node.type === 'evidence') {
      // Check if it's not already linked to this credit
      const edges = graph.getEdgesFrom(id);
      const isLinkedToCurrent = edges.some(e => e.target === creditId);
      
      if (!isLinkedToCurrent) {
        // Simple heuristic: If it's a general project document (like site plan) it might be reusable
        if (node.data.doc_category === 'Drawing' || node.data.doc_category === 'Narrative') {
          reusableEvidence.push(node);
        }
      }
    }
  }

  return reusableEvidence;
}
