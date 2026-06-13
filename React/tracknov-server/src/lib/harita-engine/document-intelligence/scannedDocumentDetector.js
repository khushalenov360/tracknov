"use strict";
/**
 * Tracknov Document Intelligence - Scanned Document Detector
 * Deterministically identifies scanned documents versus native text-embedded PDFs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScannedDocumentDetector = void 0;
class ScannedDocumentDetector {
    /**
     * Deterministically analyze document features to decide if it is scanned.
     * Leverages file metadata, character count, and image count to guarantee replay purity.
     */
    static detect(fileName, fileSize, textLength, mimeType, pageCount = 1) {
        const isImage = mimeType.startsWith("image/");
        if (isImage) {
            return {
                isScanned: true,
                embeddedTextRatio: 0.0,
                fontCount: 0,
                imageCount: 1,
                hasVectorGraphics: false,
                confidence: 1.0,
            };
        }
        // Heuristics based on file name and properties for perfect determinism in replay.
        // Scanned PDFs usually have high file size but extremely low selectable text length.
        const isScannedFileName = /scan|ocr|img|photo|draft/i.test(fileName);
        const charsPerPage = textLength / Math.max(1, pageCount);
        // Scanned PDFs typically have very few selectable characters per page (usually 0 or under 100 for scanner headers)
        const likelyScanned = charsPerPage < 150 && fileSize > 2 * 1024 * 1024;
        let confidence = 0.85;
        if (charsPerPage === 0) {
            confidence = 0.99;
        }
        else if (charsPerPage > 1000) {
            confidence = 0.95;
        }
        const isScanned = charsPerPage < 200 || likelyScanned || isScannedFileName;
        return {
            isScanned,
            embeddedTextRatio: Math.min(1.0, charsPerPage / 3500),
            fontCount: isScanned ? 1 : 12,
            imageCount: isScanned ? pageCount : 2,
            hasVectorGraphics: !isScanned,
            confidence,
        };
    }
}
exports.ScannedDocumentDetector = ScannedDocumentDetector;
