import { FallbackResponse } from "../contracts/workflow";

/**
 * Generates a deterministic fallback response when AI output is invalid or ambiguous.
 * Prevents raw AI prose from controlling workflow behavior.
 */
export function generateDeterministicFallback(
  errorType: "schema_invalid" | "hallucination_detected" | "timeout" | "unauthorized",
  contextMessage?: string
): FallbackResponse {
  const messages: Record<typeof errorType, string> = {
    schema_invalid: "The assistant returned an invalid response format. Please try again or use the manual controls.",
    hallucination_detected: "The assistant suggested an action that is not supported in the current project context.",
    timeout: "The assistant is taking too long to respond. Please check your connection and try again.",
    unauthorized: "You do not have the necessary permissions to perform this action via the assistant.",
  };

  return {
    status: "fallback",
    message: contextMessage || messages[errorType],
    error_type: errorType,
  };
}
