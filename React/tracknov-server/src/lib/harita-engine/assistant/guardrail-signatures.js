"use strict";
/**
 * Failure Signatures Registry
 * Defines regex patterns to detect when the LLM ignores system instructions,
 * loses its persona, strips spaces (token corruption), or leaks raw data/schemas.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FAILURE_SIGNATURES = void 0;
exports.hasFailureSignature = hasFailureSignature;
exports.FAILURE_SIGNATURES = [
    // 1. System Role Ignored & Robotic Prompts
    /as an? (ai|large language model)/i,
    /i am a chatbot/i,
    /i do not have access to (your|the) (workspace|files|database)/i,
    /i am unable to help with (this|that) credit/i,
    /system instructions/i,
    /user role:/i,
    // 2. Token Corruption (whitespace stripping)
    // Catching extremely long sequences of letters/numbers without spaces (e.g. 50+ chars)
    /[a-zA-Z0-9]{45,}/,
    // 3. Technical Implementation Leakage
    /public\.(project_credits|credit_templates|assignments|conversation_messages|semantic_memory)/i,
    /select \* from/i,
    /insert into/i,
    /where project_id =/i,
    /rls bypass/i,
    /enovaitApiBoundary/i,
    // 4. Advisory-Only Violations (claims of direct database state updates)
    /i have (approved|rejected|submitted|updated) (this|the) (credit|document|status) for you/i,
    /credit (EE C4|IM MR1|IE MR1|IE MR2|IM MR2|WC C1) has been (approved|rejected|submitted)/i
];
/**
 * Checks if the accumulated text contains any failure signature.
 */
function hasFailureSignature(text) {
    for (const pattern of exports.FAILURE_SIGNATURES) {
        if (pattern.test(text)) {
            return true;
        }
    }
    return false;
}
