"use strict";
/**
 * Tracknov Document Intelligence - Document Quality Analyzer
 * Evaluates extraction confidence and flags low-quality scans to warn the platform/reviewer.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentQualityAnalyzer = void 0;
class DocumentQualityAnalyzer {
    /**
     * Evaluates quality based on character frequency distributions, garbage ratios, and common keywords.
     */
    static analyze(text, isScanned) {
        const warnings = [];
        if (!text || text.trim().length === 0) {
            return {
                confidenceScore: 0.0,
                qualityClass: "LOW QUALITY",
                triggerWarning: true,
                warnings: ["Document has no selectable or extracted text."],
            };
        }
        const trimmed = text.trim();
        // 1. Calculate gibberish character ratio (special symbols not common in engineering documents)
        const specialChars = (trimmed.match(/[^a-zA-Z0-9\s\.,;:!\?\-\(\)\/\%•▪]/g) || []).length;
        const specialRatio = specialChars / trimmed.length;
        // 2. Dictionary keyword overlap test (HVAC, material, mechanical, electric, green building terms)
        const keywords = ["hvac", "ventilation", "lighting", "energy", "efficiency", "carbon", "sustainable", "material", "project", "system", "compliance", "specification", "equipment", "performance"];
        const textLower = trimmed.toLowerCase();
        const keywordMatches = keywords.filter(word => textLower.includes(word)).length;
        const keywordScore = keywordMatches / keywords.length;
        // 3. Heuristic calculation for confidence
        let confidenceScore = 1.0;
        if (isScanned) {
            confidenceScore -= 0.15; // Scan overhead penalty
        }
        confidenceScore -= specialRatio * 2.0; // High noise penalty
        confidenceScore += keywordScore * 0.1; // Semantic validation bonus
        // Bound between 0.0 and 1.0
        confidenceScore = Math.max(0.0, Math.min(1.0, confidenceScore));
        // Round to 3 decimal places
        confidenceScore = Math.round(confidenceScore * 1000) / 1000;
        let qualityClass = "HIGH CONFIDENCE";
        let triggerWarning = false;
        if (confidenceScore > 0.92) {
            qualityClass = "HIGH CONFIDENCE";
        }
        else if (confidenceScore >= 0.75) {
            qualityClass = "MODERATE";
        }
        else {
            qualityClass = "LOW QUALITY";
            triggerWarning = true;
            warnings.push("This document may reduce AI extraction quality due to poor scan clarity or formatting issues.");
        }
        if (specialRatio > 0.15) {
            warnings.push("High proportion of unrecognizable symbols detected. Rescan or re-export recommended.");
        }
        return {
            confidenceScore,
            qualityClass,
            triggerWarning,
            warnings,
        };
    }
}
exports.DocumentQualityAnalyzer = DocumentQualityAnalyzer;
