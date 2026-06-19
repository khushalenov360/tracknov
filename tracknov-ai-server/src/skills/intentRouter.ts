export type HaritaIntent =
  | "conversational"
  | "guidebook_lookup"
  | "credit_applicability"
  | "evidence_intelligence"
  | "score_model"
  | "clarification_intelligence"
  | "project_snapshot"
  | "document_pipeline"
  | "credit_gap"
  | "prioritization"
  | "blockers"
  | "assignment"
  | "task_writeback"
  | "compliance_status"
  | "general";

export type HaritaIntentLane =
  | "conversational"
  | "analytical"
  | "exploratory"
  | "operational"
  | "workflow"
  | "administrative";

export type HaritaIntentSignal = {
  intent: HaritaIntent;
  lane: HaritaIntentLane;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  preferredTools: string[];
};

const MATCHERS: Array<{
  intent: HaritaIntent;
  lane: HaritaIntentLane;
  confidence: HaritaIntentSignal["confidence"];
  preferredTools: string[];
  patterns: RegExp[];
}> = [
  {
    intent: "conversational",
    lane: "conversational",
    confidence: "high",
    preferredTools: [],
    patterns: [
      /^(hi|hello|hey|hii|good morning|good afternoon|good evening)\b/i,
    ],
  },
  {
    intent: "credit_applicability",
    lane: "analytical",
    confidence: "high",
    preferredTools: ["get_credit_applicability", "get_compliance_thresholds", "lookup_guidebook_clause"],
    patterns: [
      /\b(applicable|applicability|eligible|prerequisite|dependency|depends on|mandatory requirement|required for this credit)\b/i,
      /\b(credit|credits|igbc)\b/i,
    ],
  },
  {
    intent: "clarification_intelligence",
    lane: "operational",
    confidence: "high",
    preferredTools: ["get_clarification_intelligence", "check_document_pipeline"],
    patterns: [
      /\b(clarification|clarifications|remark loop|rework|resubmission|sent back|review loop)\b/i,
    ],
  },
  {
    intent: "score_model",
    lane: "analytical",
    confidence: "high",
    preferredTools: ["get_score_model", "calculate_credit_gap", "get_compliance_thresholds"],
    patterns: [
      /\b(score model|scoring model|projected rating|readiness score|risk adjusted|points at risk|score breakdown)\b/i,
    ],
  },
  {
    intent: "evidence_intelligence",
    lane: "analytical",
    confidence: "high",
    preferredTools: ["get_evidence_intelligence", "check_document_pipeline"],
    patterns: [
      /\b(evidence intelligence|evidence gap|missing evidence|proof gap|extraction|recommendation)\b/i,
    ],
  },
  {
    intent: "guidebook_lookup",
    lane: "analytical",
    confidence: "high",
    preferredTools: ["lookup_guidebook_clause", "get_compliance_thresholds"],
    patterns: [
      /\b(clause|section|heading|definition|define|formula|guidebook|manual|requirement|required by igbc)\b/i,
      /\b(igbc|embodied energy|low voc|lighting power density|lpd|materials|ventilation)\b/i,
    ],
  },
  {
    intent: "task_writeback",
    lane: "workflow",
    confidence: "high",
    preferredTools: ["assign_compliance_task", "get_project_snapshot"],
    patterns: [
      /\b(create task|assign task|make a task|generate a task|create follow[-\s]?up|remediation task)\b/i,
    ],
  },
  {
    intent: "credit_gap",
    lane: "analytical",
    confidence: "high",
    preferredTools: ["get_compliance_thresholds", "calculate_credit_gap", "get_project_snapshot"],
    patterns: [
      /\b(gap|delta|shortfall|how many points|points needed|points required)\b/i,
      /\b(target|rating|threshold)\b/i,
    ],
  },
  {
    intent: "document_pipeline",
    lane: "exploratory",
    confidence: "high",
    preferredTools: ["get_evidence_intelligence", "check_document_pipeline", "get_project_snapshot"],
    patterns: [
      /\b(document|documents|proof|datasheet|invoice|upload|pipeline|evidence)\b/i,
      /\b(missing|required|uploaded|pending|remark)\b/i,
    ],
  },
  {
    intent: "prioritization",
    lane: "operational",
    confidence: "high",
    preferredTools: ["get_project_snapshot", "check_document_pipeline"],
    patterns: [
      /\b(what next|next step|what should we do next|priority|prioritize|where should we start)\b/i,
    ],
  },
  {
    intent: "blockers",
    lane: "operational",
    confidence: "high",
    preferredTools: ["get_project_snapshot", "get_evidence_intelligence", "get_clarification_intelligence"],
    patterns: [
      /\b(blocker|blockers|blocked|stuck|bottleneck|risk)\b/i,
    ],
  },
  {
    intent: "assignment",
    lane: "operational",
    confidence: "high",
    preferredTools: ["get_project_snapshot", "check_document_pipeline"],
    patterns: [
      /\b(assign|assignment|owner|assignee|contributor|who should|who is responsible)\b/i,
    ],
  },
  {
    intent: "project_snapshot",
    lane: "operational",
    confidence: "medium",
    preferredTools: ["get_project_snapshot"],
    patterns: [
      /\b(project|workspace|snapshot|overview|status|summary|progress)\b/i,
    ],
  },
  {
    intent: "compliance_status",
    lane: "analytical",
    confidence: "medium",
    preferredTools: ["get_project_snapshot", "get_credit_applicability", "get_evidence_intelligence", "get_score_model", "get_compliance_thresholds", "lookup_guidebook_clause"],
    patterns: [
      /\b(compliance|compliant|certification|audit|igbc|credit)\b/i,
    ],
  },
];

export function routeIntent(message: string): HaritaIntentSignal {
  const normalized = message.trim();
  const reasons: string[] = [];

  if (!normalized) {
    return {
      intent: "conversational",
      lane: "conversational",
      confidence: "low",
      reasons: ["Empty message defaults to conversational handling."],
      preferredTools: [],
    };
  }

  for (const matcher of MATCHERS) {
    const hits = matcher.patterns.filter((pattern) => pattern.test(normalized));
    if (hits.length === matcher.patterns.length) {
      reasons.push(`Matched ${matcher.intent} via ${hits.length} regex signals.`);
      return {
        intent: matcher.intent,
        lane: matcher.lane,
        confidence: matcher.confidence,
        reasons,
        preferredTools: matcher.preferredTools,
      };
    }
  }

  for (const matcher of MATCHERS) {
    const hit = matcher.patterns.some((pattern) => pattern.test(normalized));
    if (hit) {
      reasons.push(`Partial match for ${matcher.intent}.`);
      return {
        intent: matcher.intent,
        lane: matcher.lane,
        confidence: "low",
        reasons,
        preferredTools: matcher.preferredTools,
      };
    }
  }

  return {
    intent: "general",
    lane: "exploratory",
    confidence: "low",
    reasons: ["No deterministic route matched the message."],
    preferredTools: [],
  };
}
