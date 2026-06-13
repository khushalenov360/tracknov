"use strict";
/**
 * Tracknov Extraction Feedback - Semantic Evidence Trace
 * Locates absolute text lines and line numbers inside submittals to prove matching origin.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticEvidenceTrace = void 0;
class SemanticEvidenceTrace {
    /**
     * Scans a target text block to find the exact line matching a key query term.
     */
    static getEvidenceTrace(text, queryTerm) {
        if (!text || !queryTerm)
            return null;
        const lines = text.split("\n");
        const term = queryTerm.toLowerCase().trim();
        for (let i = 0; i < lines.length; i++) {
            const lineLower = lines[i].toLowerCase();
            if (lineLower.includes(term)) {
                return {
                    matchedLine: lines[i].trim(),
                    lineNumber: i + 1,
                    matchIndex: lineLower.indexOf(term)
                };
            }
        }
        return null;
    }
}
exports.SemanticEvidenceTrace = SemanticEvidenceTrace;
