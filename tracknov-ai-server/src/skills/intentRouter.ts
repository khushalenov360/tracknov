export type HaritaIntent =
  | "guidebook_lookup"
  | "project_snapshot"
  | "document_pipeline"
  | "credit_gap"
  | "prioritization"
  | "blockers"
  | "assignment"
  | "task_writeback"
  | "compliance_status"
  | "general";

export type HaritaIntentSignal = {
  intent: HaritaIntent;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  preferredTools: string[];
};

const MATCHERS: Array<{
  intent: HaritaIntent;
  confidence: HaritaIntentSignal["confidence"];
  preferredTools: string[];
  patterns: RegExp[];
}> = [
  {
    intent: "guidebook_lookup",
    confidence: "high",
    preferredTools: ["lookup_guidebook_clause", "get_compliance_thresholds"],
    patterns: [
      /\b(clause|section|heading|definition|define|formula|guidebook|manual|requirement|required by igbc)\b/i,
      /\b(igbc|embodied energy|low voc|lighting power density|lpd|materials|ventilation)\b/i,
    ],
  },
  {
    intent: "task_writeback",
    confidence: "high",
    preferredTools: ["assign_compliance_task", "get_project_snapshot"],
    patterns: [
      /\b(create task|assign task|make a task|generate a task|create follow[-\s]?up|remediation task)\b/i,
    ],
  },
  {
    intent: "credit_gap",
    confidence: "high",
    preferredTools: ["get_compliance_thresholds", "calculate_credit_gap", "get_project_snapshot"],
    patterns: [
      /\b(gap|delta|shortfall|how many points|points needed|points required)\b/i,
      /\b(target|rating|threshold)\b/i,
    ],
  },
  {
    intent: "document_pipeline",
    confidence: "high",
    preferredTools: ["check_document_pipeline", "get_project_snapshot"],
    patterns: [
      /\b(document|documents|proof|datasheet|invoice|upload|pipeline|evidence)\b/i,
      /\b(missing|required|uploaded|pending|remark)\b/i,
    ],
  },
  {
    intent: "prioritization",
    confidence: "high",
    preferredTools: ["get_project_snapshot", "check_document_pipeline"],
    patterns: [
      /\b(what next|next step|what should we do next|priority|prioritize|where should we start)\b/i,
    ],
  },
  {
    intent: "blockers",
    confidence: "high",
    preferredTools: ["get_project_snapshot", "check_document_pipeline"],
    patterns: [
      /\b(blocker|blockers|blocked|stuck|bottleneck|risk)\b/i,
    ],
  },
  {
    intent: "assignment",
    confidence: "high",
    preferredTools: ["get_project_snapshot", "check_document_pipeline"],
    patterns: [
      /\b(assign|assignment|owner|assignee|contributor|who should|who is responsible)\b/i,
    ],
  },
  {
    intent: "project_snapshot",
    confidence: "medium",
    preferredTools: ["get_project_snapshot"],
    patterns: [
      /\b(project|workspace|snapshot|overview|status|summary|progress)\b/i,
    ],
  },
  {
    intent: "compliance_status",
    confidence: "medium",
    preferredTools: ["get_project_snapshot", "check_document_pipeline", "get_compliance_thresholds", "lookup_guidebook_clause"],
    patterns: [
      /\b(compliance|compliant|certification|audit|igbc|credit)\b/i,
    ],
  },
];

export function routeIntent(message: string): HaritaIntentSignal {
  const normalized = message.trim();
  const reasons: string[] = [];

  for (const matcher of MATCHERS) {
    const hits = matcher.patterns.filter((pattern) => pattern.test(normalized));
    if (hits.length === matcher.patterns.length) {
      reasons.push(`Matched ${matcher.intent} via ${hits.length} regex signals.`);
      return {
        intent: matcher.intent,
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
        confidence: "low",
        reasons,
        preferredTools: matcher.preferredTools,
      };
    }
  }

  return {
    intent: "general",
    confidence: "low",
    reasons: ["No deterministic route matched the message."],
    preferredTools: ["get_project_snapshot"],
  };
}
