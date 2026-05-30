import { CertificationKnowledgeGraph } from '../../intelligence-certification/graph/graphBuilder';

export class EvidenceReasoner {
  constructor(private graph: CertificationKnowledgeGraph) {}

  async evaluate(creditId: string) {
    return {
      uploadedEvidence: [],
      missingEvidence: [],
      duplicateEvidence: [],
      reusableEvidence: [],
    };
  }
}
