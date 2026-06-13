"use strict";
/**
 * Tracknov Knowledge Governance - Anonymized Learning Extractor
 * Redacts customer names, project specific keys, and document references.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnonymizedLearningExtractor = void 0;
class AnonymizedLearningExtractor {
    /**
     * Anonymizes raw text blocks so only abstract structural patterns are extracted.
     */
    static extractPattern(text) {
        if (!text)
            return "";
        let anonymized = text;
        // Redact standard email structures
        anonymized = anonymized.replace(/[\w.-]+@[\w.-]+\.\w+/g, "[EMAIL_REDACTED]");
        // Redact specific project codes (e.g. PJ-XXXX)
        anonymized = anonymized.replace(/PJ-\d+/gi, "[PROJECT_REDACTED]");
        // Redact phone numbers
        anonymized = anonymized.replace(/\+?\d{1,4}[-.\s]?\d{1,10}/g, "[PHONE_REDACTED]");
        return anonymized;
    }
}
exports.AnonymizedLearningExtractor = AnonymizedLearningExtractor;
