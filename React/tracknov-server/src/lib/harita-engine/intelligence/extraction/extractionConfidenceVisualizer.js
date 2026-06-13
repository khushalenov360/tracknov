"use strict";
/**
 * Tracknov Extraction Feedback - Extraction Confidence Visualizer
 * Maps numerical confidence scores to standard compliance labels.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractionConfidenceVisualizer = void 0;
class ExtractionConfidenceVisualizer {
    /**
     * Translates confidence score to standard UI badges and warnings.
     */
    static getConfidenceBadge(score) {
        if (score >= 0.92) {
            return {
                label: "HIGH CONFIDENCE",
                color: "emerald",
                trustRating: "EXCELLENT"
            };
        }
        if (score >= 0.75) {
            return {
                label: "MODERATE CONFIDENCE",
                color: "amber",
                trustRating: "RELIABLE"
            };
        }
        return {
            label: "LOW QUALITY",
            color: "rose",
            trustRating: "UNRELIABLE"
        };
    }
}
exports.ExtractionConfidenceVisualizer = ExtractionConfidenceVisualizer;
