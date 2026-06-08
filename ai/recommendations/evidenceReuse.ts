import { CertificationKnowledgeGraph } from '../../intelligence-certification/graph/graphBuilder';
import { findReusableEvidence } from '../../intelligence-certification/graph/evidenceGraph';

export class EvidenceReuseRecommender {
  constructor(private graph: CertificationKnowledgeGraph) {}

  async generate(creditId: string) {
    const reusable = findReusableEvidence(this.graph, creditId);
    
    return reusable.map((node) => ({
      type: 'reuse',
      evidence: node.data.title || 'Document',
      reason: 'Matches submittal criteria based on document category',
      impact: 5,
      confidence: 80
    }));
  }
}
