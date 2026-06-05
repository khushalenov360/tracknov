import { QuestionType } from "../intelligence/reasoning/question-classifier";

export class RoutingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoutingError";
  }
}

export interface RouteValidation {
  question: string;
  intent: QuestionType;
  selectedEngine: string;
  confidence: number;
}

export class IntentRoutingGovernor {
  private routingMatrix: Record<string, string[]> = {
    [QuestionType.KNOWLEDGE_QUERY]: ["KnowledgeOntologyReasoner", "GeneralAssistantEngine"],
    [QuestionType.WORKLOAD]: ["WorkloadIntelligenceEngine"],
    [QuestionType.ACTION_REQUEST]: ["UploadCopilotEngine"],
    [QuestionType.FILE_MAPPING_EXPLANATION]: ["UploadCopilotEngine", "GeneralAssistantEngine"],
    [QuestionType.NARRATIVE_ASSISTANCE]: ["NarrativeAssistanceEngine"],
    [QuestionType.SUBMISSION_READINESS]: ["SubmissionReadinessReasoner"],
    [QuestionType.CLARIFICATION_ASSISTANCE]: ["ClarificationAssistanceEngine"],
    [QuestionType.CERTIFICATION_GAP]: ["CertificationGapEngine"],
    [QuestionType.EXECUTIVE_PRIORITY]: ["ExecutivePrioritizationEngine"],
    [QuestionType.GENERAL]: ["GeneralAssistantEngine"],
    [QuestionType.BLOCKER]: ["BlockerReasoner"],
    [QuestionType.RISK]: ["RiskReasoner"]
  };

  private logs: RouteValidation[] = [];

  validateRoute(question: string, intent: QuestionType, selectedEngine: string, confidence: number) {
    const allowedEngines = this.routingMatrix[intent];
    
    this.logs.push({ question, intent, selectedEngine, confidence });

    if (!allowedEngines) {
      return true;
    }

    if (!allowedEngines.includes(selectedEngine)) {
      throw new RoutingError(`Routing violation: Intent ${intent} cannot be served by ${selectedEngine}. Allowed engines: ${allowedEngines.join(", ")}`);
    }

    return true;
  }

  getLogs() {
    return this.logs;
  }
}

export const intentRoutingGovernor = new IntentRoutingGovernor();
