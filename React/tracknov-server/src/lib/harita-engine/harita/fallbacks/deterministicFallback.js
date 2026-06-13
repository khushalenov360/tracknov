"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDeterministicFallback = generateDeterministicFallback;
/**
 * Generates a deterministic fallback response when AI output is invalid or ambiguous.
 * Prevents raw AI prose from controlling workflow behavior.
 */
function generateDeterministicFallback(errorType, contextMessage) {
    const unknownData = "I cannot confirm this from your project data.";
    const messages = {
        schema_invalid: `${unknownData} Please retry with one specific question or use the manual controls.`,
        hallucination_detected: `${unknownData} The previous response could not be grounded in your project context.`,
        timeout: `${unknownData} Please retry; I will continue with deterministic guidance if AI is unavailable.`,
        unauthorized: `${unknownData} You do not have permission for this action in the current role.`,
    };
    return {
        status: "fallback",
        message: contextMessage || messages[errorType],
        error_type: errorType,
    };
}
