import { CertificationKnowledgeGraph } from '../../intelligence-certification/graph/graphBuilder';

export class NextActionRecommender {
  constructor(private graph: CertificationKnowledgeGraph) {}

  async generate(creditId: string) {
    return [
      {
        type: 'next_action',
        action: 'Upload HVAC calculations',
        impact: 10,
        confidence: 90
      }
    ];
  }
}
