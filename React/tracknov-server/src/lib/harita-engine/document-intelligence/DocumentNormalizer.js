"use strict";
// packages/harita-engine/src/document-intelligence/DocumentNormalizer.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentNormalizer = void 0;
class DocumentNormalizer {
    /**
     * Normalizes extracted text for better classification.
     * Cleans up excess whitespace, standardizes characters, and lowercases text for matching.
     */
    normalizeText(rawText) {
        if (!rawText)
            return "";
        return rawText
            .replace(/\r\n/g, "\n")
            .replace(/\n+/g, "\n")
            .replace(/[ \t]+/g, " ")
            .trim();
    }
    /**
     * Generates a lowercase, punctuation-stripped version of the text for keyword matching.
     */
    generateMatchableText(normalizedText) {
        return normalizedText
            .toLowerCase()
            .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ")
            .replace(/\s{2,}/g, " ")
            .trim();
    }
}
exports.DocumentNormalizer = DocumentNormalizer;
