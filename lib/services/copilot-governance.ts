/**
 * TRACKNOV — Copilot Governance Service
 * Implements Sections 4, 5, 13, 14, 19, 22 of the ENOVAIT Modeled Copilot Handoff.
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
export type CopilotIntentCategory = "analysis" | "workflow" | "conversational" | "operational";

/** Legacy fine-grained intent kept for backward compatibility with deterministic routing. */
export type CopilotIntent =
  | "status"
  | "validation"
  | "workflow"
  | "mapping"
  | "summary"
  | "comparison"
  | "next_step"
  | "general";

export type NormalizedCopilotResponse = {
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
export function requiresToolCall(category: CopilotIntentCategory): boolean {
  return category === "workflow" || category === "operational";
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
    // Strip orchestration engine references
    .replace(/\b(deterministic route|multi-provider|fallback engine|tool-call phase|function call)\b:?/gi, "")
    // Strip retrieval metadata labels
    .replace(/\b(vector metadata|context_id|embedding|rag match|retrieved context)\b:?/gi, "")
    // Strip debug trace labels
    .replace(/\b(debug|trace|diagnostic|runtime log)\b:?\s*/gi, "")
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

export function disambiguateIntent(query: string): CopilotIntentCategory {
  const q = query.toLowerCase().trim();

  // Workflow: requires explicit action + confirmation pattern
  const isWorkflowAction =
    (q.includes("upload") && (q.includes("confirm") || q.includes("proceed") || q.includes("yes"))) ||
    q.includes("map this to credit") ||
    q.includes("submit this file") ||
    q.includes("push to workflow");

  if (isWorkflowAction) return "workflow";

  // Analysis: user wants AI understanding, no mutations
  const isAnalysis =
    q.includes("analyz") || q.includes("analyse") ||
    q.includes("summarize") || q.includes("explain") ||
    q.includes("read this file") || q.includes("what is this file") ||
    q.includes("tell me about the attachment") || q.includes("compare") ||
    q.includes("identify gaps") || q.includes("check compliance");

  if (isAnalysis) return "analysis";

  // Operational: navigation, team management, project actions
  const isOperational =
    q.includes("navigate to") || q.includes("go to ") ||
    q.includes("add member") || q.includes("invite ") ||
    q.includes("filter by") || q.includes("show all credits") ||
    q.includes("assign credit to");

  if (isOperational) return "operational";

  // Everything else: conversational guidance
  return "conversational";
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
export function routeCopilotIntent(query: string): CopilotIntent {
  const q = query.toLowerCase();
  if (q.includes("how many pending") || q.includes("total counts") || q.includes("overall status")) return "status";
  if (q.includes("check validation") || q.includes("is it compliant") || q.includes("validation rules")) return "validation";
  if (q.includes("workflow status") || q.includes("show my workflow") || q.includes("status of my documents")) return "workflow";
  if (q.includes("map this file to") || q.includes("tag this as") || q.includes("upload as document type")) return "mapping";
  if (q.includes("summarize this") || q.includes("analyze this file") || q.includes("tell me about the attachment")) return "summary";
  if (q.includes("compare these") || q.includes("vs credit")) return "comparison";
  if (q.includes("what is my next step") || q.includes("what should i do next")) return "next_step";
  return "general";
}

export function normalizeCopilotResponse(input: Partial<NormalizedCopilotResponse>) {
  const normalized: NormalizedCopilotResponse = {
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

export function requiresExplicitConfirmationForExecution(query: string) {
  const q = query.toLowerCase();
  const hasAction = q.includes("upload") || q.includes("map") || q.includes("submit");
  const hasConfirmation = q.includes("confirm") || q.includes("yes upload") || q.includes("proceed upload") || q.includes("and upload");
  return hasAction && !hasConfirmation;
}
