"use strict";
/**
 * Tracknov Extraction Feedback - Reviewer Correction Diff Engine
 * Compares original AI outputs against reviewer corrections to determine delta metrics.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewerCorrectionDiffEngine = void 0;
class ReviewerCorrectionDiffEngine {
    /**
     * Compares original and corrected strings, computing similarity indices and numeric shifts.
     */
    static compare(original, corrected) {
        const orig = (original || "").trim();
        const corr = (corrected || "").trim();
        const editDistance = this.levenshtein(orig, corr);
        const jaccardSimilarity = this.jaccard(orig, corr);
        const characterDelta = corr.length - orig.length;
        const originalNumbers = this.extractNumbers(orig);
        const correctedNumbers = this.extractNumbers(corr);
        const numericChangeDetected = this.areNumbersDifferent(originalNumbers, correctedNumbers);
        return {
            editDistance,
            jaccardSimilarity,
            characterDelta,
            numericChangeDetected,
            originalNumbers,
            correctedNumbers
        };
    }
    /**
     * Standard Levenshtein distance calculation
     */
    static levenshtein(a, b) {
        const matrix = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                if (a[i - 1] === b[j - 1]) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j] + 1, // deletion
                    matrix[i][j - 1] + 1, // insertion
                    matrix[i - 1][j - 1] + 1 // substitution
                    );
                }
            }
        }
        return matrix[a.length][b.length];
    }
    /**
     * Jaccard similarity index based on character bigrams
     */
    static jaccard(a, b) {
        if (a === b)
            return 1.0;
        if (!a || !b)
            return 0.0;
        const getBigrams = (str) => {
            const bigrams = new Set();
            for (let i = 0; i < str.length - 1; i++) {
                bigrams.add(str.substr(i, 2));
            }
            return bigrams;
        };
        const bigramsA = getBigrams(a.toLowerCase());
        const bigramsB = getBigrams(b.toLowerCase());
        const intersection = new Set();
        for (const val of bigramsA) {
            if (bigramsB.has(val)) {
                intersection.add(val);
            }
        }
        const unionSize = bigramsA.size + bigramsB.size - intersection.size;
        return unionSize === 0 ? 0.0 : intersection.size / unionSize;
    }
    /**
     * Regex-based float numbers extraction
     */
    static extractNumbers(text) {
        const matches = text.match(/-?\d+(\.\d+)?/g);
        if (!matches)
            return [];
        return matches.map(Number);
    }
    /**
     * Checks if numeric lists are mathematically different
     */
    static areNumbersDifferent(a, b) {
        if (a.length !== b.length)
            return true;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i])
                return true;
        }
        return false;
    }
}
exports.ReviewerCorrectionDiffEngine = ReviewerCorrectionDiffEngine;
