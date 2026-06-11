export enum QuestionType {
  WHY = "WHY",
  WHAT = "WHAT",
  WHO = "WHO",
  HOW = "HOW",
  STATUS = "STATUS",
  RISK = "RISK",
  BLOCKER = "BLOCKER",
  RECOMMENDATION = "RECOMMENDATION",
  ACTION_REQUEST = "ACTION_REQUEST",
  IMPACT_ANALYSIS = "IMPACT_ANALYSIS",
  TRADEOFF = "TRADEOFF",
  STRATEGY = "STRATEGY",
  PROJECT_STATUS = "PROJECT_STATUS",
  PROJECT_RISK = "PROJECT_RISK",
  WORKLOAD = "WORKLOAD",
  EXECUTIVE_PRIORITY = "EXECUTIVE_PRIORITY",
  CERTIFICATION_GAP = "CERTIFICATION_GAP",
  EVIDENCE_PORTFOLIO = "EVIDENCE_PORTFOLIO",
  KNOWLEDGE_QUERY = "KNOWLEDGE_QUERY",
  SUBMISSION_READINESS = "SUBMISSION_READINESS",
  NARRATIVE_ASSISTANCE = "NARRATIVE_ASSISTANCE",
  CLARIFICATION_ASSISTANCE = "CLARIFICATION_ASSISTANCE",
  CONTRIBUTOR_COPILOT = "CONTRIBUTOR_COPILOT",
  GENERAL = "GENERAL",
  FILE_MAPPING_EXPLANATION = "FILE_MAPPING_EXPLANATION"
}

export class QuestionClassifier {
  public static classify(query: string): QuestionType {
    const q = query.toLowerCase().trim();

    // CERTIFICATION_GAP
    if (q.includes("certification") && (q.includes("prevent") || q.includes("path") || q.includes("secured") || q.includes("gold") || q.includes("platinum"))) {
      return QuestionType.CERTIFICATION_GAP;
    }

    // WORKLOAD
    if (q.includes("workload") || q.includes("overloaded") || q.includes("support") || q.includes("allocate") || q.includes("resources")) {
      return QuestionType.WORKLOAD;
    }

    // CONTRIBUTOR_COPILOT — check before EXECUTIVE_PRIORITY so role-specific "do next" wins
    const knownRolesEarly = ["architect", "mep consultant", "contractor", "pmc", "sustainability consultant", "structural consultant", "landscape architect"];
    const hasRoleEarly = knownRolesEarly.some(r => q.includes(r));
    if (
      (hasRoleEarly || q.includes("copilot") || (q.includes("what should") && q.includes("do today"))) &&
      (
        q.includes("do next") || q.includes("pending") || q.includes("status") ||
        q.includes("what should") || q.includes("what does") || q.includes("copilot") ||
        q.includes("upload") || q.includes("items") || q.includes("brief") || q.includes("today")
      )
    ) {
      return QuestionType.CONTRIBUTOR_COPILOT;
    }

    // EXECUTIVE_PRIORITY
    if (q.includes("do next") || q.includes("top actions") || q.includes("30 minutes") || q.includes("highest priority") || q.includes("top 5 actions") || q.includes("highest impact")) {
      return QuestionType.EXECUTIVE_PRIORITY;
    }

    // EVIDENCE_PORTFOLIO
    if ((q.includes("documents") || q.includes("evidence")) && (q.includes("incomplete") || q.includes("rejected") || q.includes("missing") || q.includes("resubmission"))) {
      return QuestionType.EVIDENCE_PORTFOLIO;
    }

    // PROJECT_STATUS / PROJECT_RISK overrides
    // If asking about "credits" in general, it's a project level query
    if (q.includes("credits are") && (q.includes("blocked") || q.includes("ready") || q.includes("fail"))) {
      if (q.includes("blocked") || q.includes("fail")) return QuestionType.PROJECT_RISK;
      return QuestionType.PROJECT_STATUS;
    }

    // KNOWLEDGE_QUERY
    if (q.includes("required for") || q.includes("review criteria") || q.includes("evidence types") || q.includes("who uploads") || q.includes("is responsible for")) {
      return QuestionType.KNOWLEDGE_QUERY;
    }

    // SUBMISSION_READINESS — must come before generic STATUS/BLOCKER
    // Triggers on: "can X be submitted", "is X ready to submit", "ready for submission", "should we submit"
    const hasCredit = /[a-zA-Z]{2,3}\s*C\d+/i.test(q);
    if (
      hasCredit &&
      (
        q.includes("submitted today") ||
        q.includes("submit today") ||
        q.includes("ready to submit") ||
        q.includes("ready for submission") ||
        (q.includes("can") && q.includes("submitted")) ||
        q.includes("should we submit") ||
        q.includes("submission readiness") ||
        q.includes("evidence strength") ||
        q.includes("assess evidence") ||
        q.includes("evidence assessment") ||
        q.includes("not ready")
      )
    ) {
      return QuestionType.SUBMISSION_READINESS;
    }

    // NARRATIVE_ASSISTANCE
    if (q.includes("draft narrative") || q.includes("write narrative") || q.includes("draft a narrative") || q.includes("narrative for") || (q.includes("draft") && q.includes("narrative")) || (q.includes("write") && q.includes("narrative"))) {
      return QuestionType.NARRATIVE_ASSISTANCE;
    }

    // CLARIFICATION_ASSISTANCE
    if (
      (q.includes("clarification") || q.includes("respond to") || q.includes("reply to") || q.includes("rejection")) &&
      (q.includes("draft") || q.includes("help") || q.includes("write") || q.includes("how do i") || q.includes("response"))
    ) {
      return QuestionType.CLARIFICATION_ASSISTANCE;
    }

    // CONTRIBUTOR_COPILOT
    const knownRoles = ["architect", "mep consultant", "contractor", "pmc", "sustainability consultant", "structural consultant", "landscape architect"];
    const hasRole = knownRoles.some(r => q.includes(r));
    if (
      hasRole &&
      (
        q.includes("do next") || q.includes("pending") || q.includes("status") ||
        q.includes("what should") || q.includes("what does") || q.includes("copilot") ||
        q.includes("upload") || q.includes("items") || q.includes("brief")
      )
    ) {
      return QuestionType.CONTRIBUTOR_COPILOT;
    }

    // FILE_MAPPING_EXPLANATION
    if (q.includes("why") && (q.includes("map") || q.includes("mapped") || q.includes("suggest") || q.includes("classified"))) {
      return QuestionType.FILE_MAPPING_EXPLANATION;
    }

    // ACTION_REQUEST (Phase 9 Threshold)
    if (
      (q.includes("upload") || q.includes("submit") || q.includes("assign") || q.includes("map") || q.includes("reassign")) &&
      (q.includes("confirm") || q.includes("this document") || q.includes("to eda") || q.includes("proceed"))
    ) {
      return QuestionType.ACTION_REQUEST;
    }

    // IMPACT_ANALYSIS
    if (q.includes("impact") || q.includes("affect") || q.includes("consequence") || (q.includes("what happens if") && !q.includes("we"))) {
      return QuestionType.IMPACT_ANALYSIS;
    }

    // TRADEOFF
    if (q.includes("tradeoff") || q.includes("vs") || q.includes("versus") || q.includes("instead of") || q.includes("better to")) {
      return QuestionType.TRADEOFF;
    }

    // STRATEGY
    if (q.includes("strategy") || q.includes("best way") || q.includes("approach") || q.includes("optimize")) {
      return QuestionType.STRATEGY;
    }

    // BLOCKER
    if (q.includes("preventing") || q.includes("blocking") || q.includes("blocker") || q.includes("stuck") || q.includes("missing")) {
      return QuestionType.BLOCKER;
    }

    // RISK
    if (q.includes("risk") || q.includes("danger") || q.includes("jeopardy") || q.includes("delay")) {
      return QuestionType.RISK;
    }

    // RECOMMENDATION
    if (q.includes("recommend") || q.includes("suggest") || q.includes("next step") || q.includes("what should i do") || q.includes("improve") || q.includes("action would") || q.includes("how to fix")) {
      return QuestionType.RECOMMENDATION;
    }

    // STATUS
    if (q.includes("status") || q.includes("ready") || q.includes("progress") || q.includes("completion")) {
      return QuestionType.STATUS;
    }

    // WHY
    if (q.startsWith("why") || q.includes(" why ")) {
      return QuestionType.WHY;
    }

    // WHO
    if (q.startsWith("who") || q.includes(" who ") || q.includes("assigned to") || q.includes("owns")) {
      return QuestionType.WHO;
    }

    // HOW
    if (q.startsWith("how") || q.includes(" how ")) {
      return QuestionType.HOW;
    }

    // WHAT
    if (q.startsWith("what") || q.includes(" what ")) {
      return QuestionType.WHAT;
    }

    return QuestionType.GENERAL;
  }
}
