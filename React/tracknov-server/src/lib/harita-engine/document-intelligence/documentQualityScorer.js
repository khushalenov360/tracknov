"use strict";
/**
 * Tracknov Document Intelligence - Document Quality Scorer
 * Aggregates readability, scan skew, compression, and text completeness into a score.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentQualityScorer = void 0;
class DocumentQualityScorer {
    /**
     * Deterministically evaluates document metrics based on content features.
     */
    static score(text, isScanned, fileSize) {
        const ocrConfidence = isScanned ? 0.78 : 0.98;
        // Scanned documents have higher noise and slight compression damage
        const scanSkew = isScanned ? 0.05 : 0.0;
        const compressionDamage = fileSize > 5 * 1024 * 1024 && isScanned ? 0.12 : 0.02;
        const specialChars = (text.match(/[^a-zA-Z0-9\s\.,;:!\?\-\(\)\/]/g) || []).length;
        const specialRatio = text.length > 0 ? specialChars / text.length : 0.0;
        const textCompleteness = Math.max(0.2, 1.0 - specialRatio * 2.0);
        const tableReadability = text.includes("|") ? 0.92 : 0.85;
        const imageClarity = isScanned ? 0.82 : 0.99;
        // Weighted average score
        let aggregateScore = ocrConfidence * 0.3 +
            imageClarity * 0.2 +
            tableReadability * 0.15 +
            textCompleteness * 0.2 -
            scanSkew * 0.1 -
            compressionDamage * 0.05;
        aggregateScore = Math.max(0.0, Math.min(1.0, aggregateScore));
        aggregateScore = Math.round(aggregateScore * 1000) / 1000;
        return {
            ocrConfidence,
            imageClarity,
            tableReadability,
            textCompleteness,
            scanSkew,
            compressionDamage,
            aggregateScore,
        };
    }
}
exports.DocumentQualityScorer = DocumentQualityScorer;
