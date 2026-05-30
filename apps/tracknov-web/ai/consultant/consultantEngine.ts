import { ProjectReasoner } from './projectReasoner';
import { CreditReasoner } from './creditReasoner';
import { EvidenceReasoner } from './evidenceReasoner';
import { ReadinessReasoner } from './readinessReasoner';
import { ClarificationReasoner } from './clarificationReasoner';
import { CertificationKnowledgeGraph } from '../../intelligence-certification/graph/graphBuilder';

export class ConsultantEngine {
  graph: CertificationKnowledgeGraph;
  projectReasoner: ProjectReasoner;
  creditReasoner: CreditReasoner;
  evidenceReasoner: EvidenceReasoner;
  readinessReasoner: ReadinessReasoner;
  clarificationReasoner: ClarificationReasoner;

  constructor(graph: CertificationKnowledgeGraph) {
    this.graph = graph;
    this.projectReasoner = new ProjectReasoner(graph);
    this.creditReasoner = new CreditReasoner(graph);
    this.evidenceReasoner = new EvidenceReasoner(graph);
    this.readinessReasoner = new ReadinessReasoner(graph);
    this.clarificationReasoner = new ClarificationReasoner(graph);
  }

  async evaluateProjectHealth(projectId: string) {
    return this.projectReasoner.evaluate(projectId);
  }

  async evaluateCredit(creditId: string) {
    return this.creditReasoner.evaluate(creditId);
  }
}
