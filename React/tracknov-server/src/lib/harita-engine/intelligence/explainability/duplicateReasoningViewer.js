"use strict";
/**
 * Tracknov Extraction Feedback - Duplicate Reasoning Viewer
 * Formulates detailed textual explanations of detected submittal duplication weights.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuplicateReasoningViewer = void 0;
class DuplicateReasoningViewer {
    /**
     * Generates a descriptive narrative regarding duplicate warning reasoning.
     */
    static getDuplicateReason(overlapRatio, matchedDocuments, matchedParameters) {
        const percentage = (overlapRatio * 100).toFixed(0);
        const docs = matchedDocuments.join(", ");
        const params = matchedParameters.join(", ");
        return `Duplicate Evidence Warning with ${percentage}% semantic overlap matched against [${docs}]. Overlaps detected on parameters [${params}].`;
    }
}
exports.DuplicateReasoningViewer = DuplicateReasoningViewer;
