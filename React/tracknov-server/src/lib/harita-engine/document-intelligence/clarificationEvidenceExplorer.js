"use strict";
/**
 * Tracknov Extraction Feedback - Clarification Evidence Explorer
 * Provides granular mapping explaining exactly why a clarification was drafted.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClarificationEvidenceExplorer = void 0;
class ClarificationEvidenceExplorer {
    /**
     * Generates explainer object for clarification template triggers.
     */
    static exploreGaps(missingItems, existingEvidence, auditorRigor) {
        const missing = missingItems.join(", ");
        const existing = existingEvidence.length > 0 ? existingEvidence.join(", ") : "No prior submittals";
        const reason = `Clarification drafted under ${auditorRigor} auditor rigor. Required items [${missing}] were not found in current upload. Verified assets found: [${existing}].`;
        const recommendedResolutions = missingItems.map(item => `Please upload certified ${item} documents.`);
        return {
            reason,
            missingItems,
            recommendedResolutions
        };
    }
}
exports.ClarificationEvidenceExplorer = ClarificationEvidenceExplorer;
