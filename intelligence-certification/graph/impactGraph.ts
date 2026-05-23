import { CertificationKnowledgeGraph, GraphNode } from './graphBuilder';

export interface ImpactAnalysis {
  affectedCredits: GraphNode[];
  affectedReadiness: number;
  affectedApprovals: GraphNode[];
}

export function calculateImpact(graph: CertificationKnowledgeGraph, removedEvidenceId: string): ImpactAnalysis {
  const affectedCredits = new Set<GraphNode>();
  const affectedApprovals = new Set<GraphNode>();
  let affectedReadiness = 0;

  // Find all edges out of this evidence that indicate it belongs to or validates something
  const edgesOut = graph.getEdgesFrom(removedEvidenceId);
  
  for (const edge of edgesOut) {
    if (edge.relationship === 'belongs_to' || edge.relationship === 'validates') {
      const target = graph.getNode(edge.target);
      if (target?.type === 'submittal') {
        affectedApprovals.add(target);
        
        // Find credit this submittal belongs to
        const submittalEdges = graph.getEdgesFrom(target.id);
        for (const se of submittalEdges) {
          if (se.relationship === 'belongs_to') {
            const credit = graph.getNode(se.target);
            if (credit?.type === 'credit') {
              affectedCredits.add(credit);
              affectedReadiness -= (edge.weight || 5); // Example dummy weight impact
            }
          }
        }
      }
      if (target?.type === 'credit') {
        affectedCredits.add(target);
        affectedReadiness -= (edge.weight || 5);
      }
    }
  }

  return {
    affectedCredits: Array.from(affectedCredits),
    affectedReadiness,
    affectedApprovals: Array.from(affectedApprovals),
  };
}
