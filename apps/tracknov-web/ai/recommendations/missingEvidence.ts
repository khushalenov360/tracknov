import { CertificationKnowledgeGraph } from '../../intelligence-certification/graph/graphBuilder';

export class MissingEvidenceRecommender {
  constructor(private graph: CertificationKnowledgeGraph) {}

  async generate(creditId: string) {
    return [
      {
        type: 'missing_evidence',
        evidence: 'HVAC Schedule',
        reason: 'Required by EAp1 Baseline',
        impact: 18,
        confidence: 94
      }
    ];
  }
}
