"use strict";
/**
 * Tracknov Document Intelligence - AI Clarification Context Builder
 * Assembles a unified context record representing all historical submittals and EPD standards.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClarificationContextBuilder = void 0;
class ClarificationContextBuilder {
    /**
     * Orchestrates the compilation of a high-fidelity context packet for the AI execution layers.
     */
    static build(projectId, documentId, semanticCategory, text, history, resolutions) {
        const textLower = text.toLowerCase();
        // Scan high-importance keywords
        const keywordsList = ["cop", "lux", "epd", "voc", "ventilation", "chiller", "flow", "recycled"];
        const matchedKeywords = keywordsList.filter(kw => textLower.includes(kw));
        return {
            projectId,
            documentId,
            semanticCategory,
            matchedKeywords,
            relevantHistory: history.slice(0, 3), // Limit history items to avoid context overflow
            suggestedResolutions: resolutions,
            timestamp: new Date().toISOString(),
        };
    }
}
exports.ClarificationContextBuilder = ClarificationContextBuilder;
