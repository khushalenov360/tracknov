"use strict";
/**
 * Tracknov Document Intelligence - Clarification Semantic Engine
 * Dynamically formulates precise, context-aware, short clarification feedback templates.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClarificationSemanticEngine = void 0;
class ClarificationSemanticEngine {
    /**
     * Generates short, actionable review draft recommendations based on document gaps.
     */
    static generateClarificationDraft(creditCode, gaps, qualityWarnings = []) {
        const requiredActions = gaps.map(gap => `Upload complete ${gap.missingElement}.`);
        if (qualityWarnings.length > 0) {
            requiredActions.push("Re-scan or upload high-resolution vector PDF.");
        }
        const actionList = requiredActions.map(act => `- ${act}`).join("\n");
        const subject = `Clarification Required: Submittal Credit [${creditCode.toUpperCase()}]`;
        const body = `Dear Team,

We have completed the initial automated semantic evaluation of the evidence documents submitted for Credit ${creditCode.toUpperCase()}.

To complete the audit review, please address the following outstanding items:
${actionList || "- Provide manufacturer datasheets confirming green building compliance specifications."}

Please note: All resubmissions must conform to strict upload governance parameters.

Sincerely,
Tracknov Document Intelligence Reviewer Assist`;
        return {
            subject,
            body,
            requiredActions,
        };
    }
}
exports.ClarificationSemanticEngine = ClarificationSemanticEngine;
