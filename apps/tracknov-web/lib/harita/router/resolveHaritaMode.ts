export type HaritaMode = "conversation" | "workflow";

export type HaritaIntent =
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
 * Resolves the Harita mode based on the detected intent.
 * Follows the EnovAIT Modeled Harita Architecture law.
 */
export function resolveHaritaMode(intent: HaritaIntent): HaritaMode {
  const workflowIntents: HaritaIntent[] = [
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
