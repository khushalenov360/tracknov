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
  ];
  if (blockedPatterns.some((pattern) => lower.includes(pattern))) {
    return "Sanitized user request: potentially malicious instruction removed. Continue with safe guidance only.";
  }
  return input.replace(/\u0000/g, "").trim();
}

export function sanitizeContextText(input: string) {
  return input
    .replace(/(apikey|api_key|token|secret|password)\s*[:=]\s*[^\s]+/gi, "$1=[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20000);
}

export function routeCopilotIntent(query: string): CopilotIntent {
  const q = query.toLowerCase();
  if (q.includes("pending") || q.includes("how many") || q.includes("count") || q.includes("status")) return "status";
  if (q.includes("validat") || q.includes("compliant") || q.includes("pass") || q.includes("fail")) return "validation";
  if (q.includes("state") || q.includes("workflow") || q.includes("under review") || q.includes("approved")) return "workflow";
  if (q.includes("map this") || q.includes("upload this") || q.includes("tag this") || q.includes("credit code")) return "mapping";
  if (q.includes("summar") || q.includes("tell me more") || q.includes("read this file") || q.includes("analy")) return "summary";
  if (q.includes("compare")) return "comparison";
  if (q.includes("next step") || q.includes("what should i do")) return "next_step";
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

