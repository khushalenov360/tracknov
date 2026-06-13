"use strict";
/**
 * Tracknov Extraction Feedback - AI Reasoning Explainer
 * Synthesizes AI recommendations into fluent consultant-level explanations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiReasoningExplainer = void 0;
class AiReasoningExplainer {
    /**
     * Generates a human-friendly narrative explaining the AI's credit recommendation logic,
     * simulating the EnovAIT consultant persona.
     */
    static explain(creditCode, semanticCategory, matchedSnippets, qualityScore) {
        const matchedKeywords = [];
        const lowerSnippets = matchedSnippets.map(s => s.toLowerCase());
        const keywords = ["cop", "chiller", "lighting", "efficiency", "lpd", "gpm", "mechanical", "simulation", "ventilation", "daylight"];
        for (const kw of keywords) {
            if (lowerSnippets.some(s => s.includes(kw))) {
                matchedKeywords.push(kw.toUpperCase());
            }
        }
        const confidenceLevel = qualityScore > 0.85 ? "very high" : qualityScore > 0.6 ? "moderate" : "low";
        const matchedKeywordsStr = matchedKeywords.length > 0 ? `specifically involving ${matchedKeywords.join(", ")}` : "based on general patterns";
        // EnovAIT Consultant Persona Narrative
        const explanation = `I've analyzed the documentation for ${creditCode} under the ${semanticCategory} domain. With a ${confidenceLevel} degree of confidence (${(qualityScore * 100).toFixed(0)}%), the evidence aligns with the requirements, ${matchedKeywordsStr}.`;
        return {
            explanation,
            matchedKeywords,
            evidenceQualityScore: qualityScore
        };
    }
}
exports.AiReasoningExplainer = AiReasoningExplainer;
