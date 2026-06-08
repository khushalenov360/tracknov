import { MissingEvidenceRecommender } from './missingEvidence';
import { NextActionRecommender } from './nextAction';
import { EvidenceReuseRecommender } from './evidenceReuse';
import { ReadinessActionsRecommender } from './readinessActions';
import { CertificationKnowledgeGraph } from '../../intelligence-certification/graph/graphBuilder';

export class RecommendationEngine {
  missingEvidence: MissingEvidenceRecommender;
  nextAction: NextActionRecommender;
  evidenceReuse: EvidenceReuseRecommender;
  readinessActions: ReadinessActionsRecommender;

  constructor(private graph: CertificationKnowledgeGraph) {
    this.missingEvidence = new MissingEvidenceRecommender(graph);
    this.nextAction = new NextActionRecommender(graph);
    this.evidenceReuse = new EvidenceReuseRecommender(graph);
    this.readinessActions = new ReadinessActionsRecommender(graph);
  }

  async getTopRecommendations(creditId: string) {
    const missing = await this.missingEvidence.generate(creditId);
    const reuse = await this.evidenceReuse.generate(creditId);
    const next = await this.nextAction.generate(creditId);

    // Combine and rank the top 5
    const combined = [...missing, ...reuse, ...next].sort((a, b) => (b.impact || 0) - (a.impact || 0));
    return combined.slice(0, 5);
  }
}
