"use strict";
/**
 * Tracknov Document Intelligence - Low Confidence Detection
 * Flags specific low confidence paragraphs and downgrades matching confidence to avoid auditor hallucinations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LowConfidenceDetection = void 0;
class LowConfidenceDetection {
    /**
     * Scans individual paragraphs to isolate specific low-confidence textual segments.
     */
    static scan(text) {
        if (!text)
            return [];
        const blocks = [];
        const lines = text.split("\n");
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.length < 20)
                continue;
            // Noise indicators like lone letters, repeated single symbols, missing spaces
            const specialCharCount = (line.match(/[^a-zA-Z0-9\s]/g) || []).length;
            const spaceCount = (line.match(/\s/g) || []).length;
            const numRatio = (line.match(/[0-9]/g) || []).length / line.length;
            // Heuristics for corrupted text rows
            if (specialCharCount / line.length > 0.25) {
                blocks.push({
                    lineNumber: i + 1,
                    textSnippet: line.substr(0, 80) + (line.length > 80 ? "..." : ""),
                    confidenceScore: 0.52,
                    reason: "High concentration of non-alphanumeric character noise.",
                });
            }
            else if (spaceCount === 0 && line.length > 40) {
                blocks.push({
                    lineNumber: i + 1,
                    textSnippet: line.substr(0, 80),
                    confidenceScore: 0.45,
                    reason: "Extremely low spacing ratio. Text lines might be merged or un-spaced.",
                });
            }
            else if (numRatio > 0.50 && !line.includes("|") && line.length > 50) {
                blocks.push({
                    lineNumber: i + 1,
                    textSnippet: line.substr(0, 80),
                    confidenceScore: 0.60,
                    reason: "Excessive number density without standard tabular structures.",
                });
            }
        }
        return blocks;
    }
}
exports.LowConfidenceDetection = LowConfidenceDetection;
