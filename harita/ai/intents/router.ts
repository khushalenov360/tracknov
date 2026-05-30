import type { AIIntent } from "@/ai/intents/types";

export function resolveIntentFromPrompt(prompt: string): AIIntent {
  const q = String(prompt ?? "").toLowerCase();
  if (q.includes("assign")) return "assignContributor";
  if (q.includes("upload")) return "uploadDocument";
  if (q.includes("clarification")) return "requestClarification";
  if (q.includes("approve")) return "approveSubmittal";
  if (q.includes("reject")) return "rejectSubmittal";
  if (q.includes("submission pack") || q.includes("generate pack")) return "generateSubmissionPack";
  if (q.includes("escalate")) return "escalateIssue";
  if (q.includes("reassign reviewer")) return "reassignReviewer";
  if (q.includes("reopen")) return "reopenSubmission";
  return "general";
}
