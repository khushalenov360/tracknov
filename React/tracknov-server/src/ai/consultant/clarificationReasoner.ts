import { CertificationKnowledgeGraph } from '../../intelligence-certification/graph/graphBuilder';

export class ClarificationReasoner {
  constructor(private graph: CertificationKnowledgeGraph) {}

  async evaluate(clarificationId: string) {
    return {
      status: 'OPEN',
      resolutionPlan: [],
    };
  }
}
