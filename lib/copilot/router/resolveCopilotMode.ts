export type CopilotMode = "conversation" | "workflow";

export type CopilotIntent =
  | "summarize"
  | "explain"
  | "recommend"
  | "analyze"
  | "upload"
  | "assign"
  | "approve"
  | "validate"
  | "map_document"
  | "unknown";

/**
 * Resolves the copilot mode based on the detected intent.
 * Follows the EnovAIT Modeled Copilot Architecture law.
 */
export function resolveCopilotMode(intent: CopilotIntent): CopilotMode {
  const workflowIntents: CopilotIntent[] = [
    "upload",
    "assign",
    "approve",
    "validate",
    "map_document",
  ];

  if (workflowIntents.includes(intent)) {
    return "workflow";
  }

  return "conversation";
}
