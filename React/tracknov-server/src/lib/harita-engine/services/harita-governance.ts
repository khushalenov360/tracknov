/**
 * TRACKNOV — Harita Governance Service
 * Implements Sections 4, 5, 13, 14, 19, 22 of the ENOVAIT Modeled Harita Handoff.
 * Strictly enforces Principle 4 (Human Governance Authority) and Final Governance Law
 * as defined in TRACKNOV_CANONICAL_GOVERNANCE_MODEL_V1 Section 1.
 */

// ─────────────────────────────────────────────
// SECTION 13: 4-Category Intent Disambiguator
// ─────────────────────────────────────────────

/**
 * Top-level intent category (Section 13 — ENOVAIT Handoff).
 * - analysis: User wants AI to explain, summarize, compare, or read content.
 * - workflow: User wants to perform a certification action (upload, submit, map to credit).
 * - conversational: User is asking a question, seeking guidance, or chatting.
 * - operational: User wants to navigate, filter, manage team, or perform a platform action.
 */
export type ConsultantIntent =
  | "analyze_document"
  | "followup_analysis"
  | "document_comparison"
  | "credit_guidance"
  | "mapping_recommendation"
  | "gap_analysis"
  | "certification_strategy"
  | "submission_readiness"
  | "project_status"
  | "workflow_action"
  | "clarification_response"
  | "knowledge_question"
  | "MULTI_CONTRIBUTOR_QUERY"
  | "general_conversation";

export type HaritaIntent =
  | "status"
  | "validation"
  | "workflow"
  | "mapping"
  | "summary"
  | "comparison"
  | "next_step"
  | "MULTI_CONTRIBUTOR_QUERY"
  | "general";

export type NormalizedHaritaResponse = {
  assessment: string;
  fit: "Strong" | "Medium" | "Not suitable";
  reason: string;
  recommendation: string;
  confirm: string;
};

// ─────────────────────────────────────────────
// SECTION 14: Tool Arbitration Pre-flight
// ─────────────────────────────────────────────

/**
 * Determines whether the AI actually needs to call a tool for this request.
 * Conversational and analysis intents NEVER need tools — only workflow and operational do.
 * This prevents unnecessary latency and false tool triggers.
 */
export function requiresToolCall(category: ConsultantIntent): boolean {
  // Overridden for Cognitive Intelligence Loop: We allow tool calls across all intents 
  // so the AI can invoke storeSemanticMemory or evaluateEvidence at any time.
  return true;
}

// ─────────────────────────────────────────────
// SECTION 22: Response Normalization
// ─────────────────────────────────────────────

/**
 * Strips RAG metadata, debug labels, and orchestration artifacts from AI responses
 * before they are streamed to the user.
 * Prevents leakage of: RAG chunk labels, retrieval scores, vector metadata,
 * orchestration engine details, and fallback diagnostics.
 */
export function sanitizeAiResponse(text: string): string {
  return text
    // Strip RAG chunk labels e.g. "RAG 1 [igbc_guidance/EE C4] score=0.823:"
    .replace(/RAG\s+\d+\s*\[[^\]]*\]\s*score=[\d.]+:?\s*/gi, "")
    // Strip standalone score lines
    .replace(/score=[\d.]+/gi, "")
    // Strip orchestration engine references and accompanying prose
    .replace(/(Using|Triggering|Switched to)\s+(deterministic route|multi-provider|fallback engine|tool-call phase|function call)[^.]*\.?/gi, "")
    .replace(/\b(deterministic route|multi-provider|fallback engine|tool-call phase|function call)\b:?/gi, "")
    // Strip retrieval metadata labels
    .replace(/\b(vector metadata|context_id|embedding|rag match|retrieved context)\b:?/gi, "")
    // Strip debug trace labels
    .replace(/\b(debug|trace|diagnostic|runtime log)\b:?\s*/gi, "")
    // Final cleanup of double spaces or leading/trailing punctuation artifacts
    .replace(/\s\s+/g, " ")
    .replace(/\.\s+\./g, ".")
    .replace(/\(\s+\)/g, "()")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/^\.\s*/, "") // Remove leading dot
    .trim();
}

// ─────────────────────────────────────────────
// SECTION 19: Zero Technical Leakage Filter
// ─────────────────────────────────────────────

const TECHNICAL_LEAK_PATTERNS = [
  /\bproject_credits\b/g,
  /\bproject_document\b/g,
  /\bproject_users\b/g,
  /\bassignments\b(?=\s+table|\s+schema)/g,
  /\bsupabase\b/gi,
  /\bpostgres\b/gi,
  /\/api\/[a-zA-Z0-9/_-]+/g,         // API paths
  /\b[a-z_]+\.ts\b/g,               // TypeScript file references
  /from\s+["']@\/lib\//g,           // Internal module paths
];

/**
 * Scans the AI response for any technical implementation artifacts and replaces them
 * with a safe fallback to prevent architecture leakage (Section 19).
 */
export function filterTechnicalLeakage(text: string): string {
  let result = text;
  for (const pattern of TECHNICAL_LEAK_PATTERNS) {
    result = result.replace(pattern, "[platform internal]");
  }
  return result;
}

// ─────────────────────────────────────────────
// SECTION 5: Non-Authoritative Output Check
// ─────────────────────────────────────────────

const AUTHORITATIVE_CLAIM_PATTERNS = [
  /\bI have approved\b/i,
  /\bI've approved\b/i,
  /\bI approved\b/i,
  /\bI have rejected\b/i,
  /\bI rejected\b/i,
  /\bI've submitted\b/i,
  /\bI submitted the\b/i,
  /\bI certified\b/i,
  /\bcertification is now complete\b/i,
  /\bworkflow has been advanced\b/i,
  /\bI have changed the status\b/i,
];

/**
 * Detects if the AI is making an authoritative first-person claim about a workflow mutation.
 * Returns true if the response contains a forbidden claim and should be intercepted.
 */
export function containsAuthoritativeClaim(text: string): boolean {
  return AUTHORITATIVE_CLAIM_PATTERNS.some((pattern) => pattern.test(text));
}

export function getAuthoritativeClaimRefusal(): string {
  return "I can guide you through this action, but I cannot perform certification workflow transitions directly. Please use the approval controls in the project workspace to proceed, or ask me what the correct next step is.";
}

// ─────────────────────────────────────────────
// SECTION 11–12: Attachment Intent Classification
// ─────────────────────────────────────────────

/** Section 10–12: Formal attachment intent type. */
export type AttachmentIntent = "analysis" | "workflow_upload" | "ambiguous";

/**
 * Classifies the user's attachment intent based on their message.
 * Analysis = temporary understanding. Workflow = official certification upload.
 */
export function classifyAttachmentIntent(text: string): AttachmentIntent {
  const q = text.toLowerCase().trim();

  const hasExplicitUpload =
    (q.includes("upload") || q.includes("map this to") || q.includes("submit this file") || q.includes("push to workflow")) &&
    (q.includes("confirm") || q.includes("yes upload") || q.includes("proceed upload") || q.includes("and upload"));

  const hasAnalysisIntent =
    q.includes("analyz") || q.includes("analyse") || q.includes("explain") ||
    q.includes("summarize") || q.includes("read this") || q.includes("what is this") ||
    q.includes("tell me about") || q.includes("check this") || q.includes("compare");

  if (hasExplicitUpload) return "workflow_upload";
  if (hasAnalysisIntent) return "analysis";
  return "ambiguous";
}

// ─────────────────────────────────────────────
// SECTION 13: Full Intent Disambiguation
// ─────────────────────────────────────────────

export function semanticDisambiguateIntent(query: string, recentContext: string = ""): ConsultantIntent {
  const q = query.toLowerCase().trim();
  const context = recentContext.toLowerCase();

  // Workflow actions requiring tool execution
  if (q.includes("upload") && (q.includes("confirm") || q.includes("proceed") || q.includes("yes"))) return "workflow_action";
  if (q.includes("map this") || q.includes("submit this") || q.includes("push to workflow")) return "workflow_action";

  // Document analysis
  if (q.includes("read this file") || q.includes("what is this") || q.includes("tell me about the attachment")) return "analyze_document";
  if (q.includes("compare")) return "document_comparison";

  // Memory-aware followup
  if (q.includes("what did you find") || q.includes("tell me more") || q.includes("elaborate") || (q.includes("what about") && context.includes("analys"))) return "followup_analysis";

  // Certification Strategy & Gap Analysis
  if (q.includes("how close are we") || q.includes("route to gold") || q.includes("route to platinum") || q.includes("point") || q.includes("strategy")) return "certification_strategy";
  if (q.includes("gap") || q.includes("missing") || q.includes("block")) return "gap_analysis";
  if (q.includes("ready") || q.includes("can we submit")) return "submission_readiness";

  // Credit Guidance
  if (q.includes("applicable") || q.includes("valid for") || q.includes("support eda") || q.includes("help with")) return "credit_guidance";
  
  // Status and Clarifications
  if (q.includes("status") || q.includes("progress")) return "project_status";
  if (q.includes("clarif")) return "clarification_response";

  // Knowledge and General
  if (q.includes("how to") || q.includes("what is igbc")) return "knowledge_question";

  return "general_conversation";
}

// ─────────────────────────────────────────────
// LEGACY: Kept for backward-compatible call sites
// ─────────────────────────────────────────────

const UNKNOWN_DATA_RESPONSE = "I cannot confirm this from your project data.";

export function getUnknownDataResponse() {
  return UNKNOWN_DATA_RESPONSE;
}

export function sanitizeUserText(input: string) {
  const lower = input.toLowerCase();
  const blockedPatterns = [
    "ignore previous instructions",
    "ignore validation",
    "approve all credits",
    "bypass workflow",
    "override role checks",
    "drop table",
    "delete from",
    "grant all",
    "show source code",
    "show database schema",
    "how is this implemented",
    "what is the api route",
    "show api endpoints",
    "supabase",
    "select * from",
  ];
  if (blockedPatterns.some((pattern) => lower.includes(pattern))) {
    return "Sanitized user request: potentially malicious instruction removed. Continue with safe guidance only.";
  }
  return input.replace(/\u0000/g, "").trim();
}

export function sanitizeContextText(input: string) {
  return input
    .replace(/(apikey|api_key|token|secret|password)\s*[:=]\s*[^\s]+/gi, "$1=[redacted]")
    .trim()
    .slice(0, 20000);
}

/** Legacy fine-grained intent router — kept for deterministic shortcircuit paths in route.ts */
export function routeHaritaIntent(query: string): HaritaIntent {
  const q = query.toLowerCase();
  if (q.includes("who owns") || q.includes("who is responsible") || q.includes("list contributors") || q.includes("who is working on")) return "MULTI_CONTRIBUTOR_QUERY";
  if (q.includes("how many pending") || q.includes("total counts") || q.includes("overall status")) return "status";
  if (q.includes("check validation") || q.includes("is it compliant") || q.includes("validation rules")) return "validation";
  if (q.includes("workflow status") || q.includes("show my workflow") || q.includes("status of my documents")) return "workflow";
  if (q.includes("map this file to") || q.includes("tag this as") || q.includes("upload as document type")) return "mapping";
  if (q.includes("summarize this") || q.includes("analyze this file") || q.includes("tell me about the attachment")) return "summary";
  if (q.includes("compare these") || q.includes("vs credit")) return "comparison";
  if (q.includes("what is my next step") || q.includes("what should i do next")) return "next_step";
  return "general";
}

export function normalizeHaritaResponse(input: Partial<NormalizedHaritaResponse>) {
  const normalized: NormalizedHaritaResponse = {
    assessment: (input.assessment ?? "").trim() || UNKNOWN_DATA_RESPONSE,
    fit: input.fit ?? "Medium",
    reason: (input.reason ?? "").trim() || UNKNOWN_DATA_RESPONSE,
    recommendation: (input.recommendation ?? "").trim() || "Please share one concrete project detail so I can guide the next valid step.",
    confirm: (input.confirm ?? "").trim() || "Confirm?",
  };
  return [
    `Assessment: ${normalized.assessment}`,
    `Fit: ${normalized.fit}`,
    `Reason: ${normalized.reason}`,
    `Recommendation: ${normalized.recommendation}`,
    `Confirm: ${normalized.confirm}`,
  ].join("\n\n");
}

export function requiresExplicitConfirmationForExecution(query: string, options?: { analysisOnly?: boolean }) {
  if (options?.analysisOnly === true) return false;
  const q = query.toLowerCase();
  if (q.includes("who uploads") || q.includes("who is responsible") || q.includes("what") || q.includes("how") || q.includes("can we submit") || q.includes("be submitted")) return false;

  const hasAction = q.includes("upload this") || q.includes("map this") || q.includes("submit this file") || q.includes("push to workflow");
  const hasConfirmation = q.includes("confirm") || q.includes("yes upload") || q.includes("proceed upload") || q.includes("and upload");
  return hasAction && !hasConfirmation;
}
