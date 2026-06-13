"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClarificationResponse = void 0;
class ClarificationResponse {
    generateDraft(classification, intent) {
        if (classification === 'DOCUMENT_UPLOAD_REQUIRED') {
            return `Please upload the ${intent.evidenceType} documents. Our systems indicate this is missing.`;
        }
        return `We are reviewing the requirements for ${intent.evidenceType}.`;
    }
}
exports.ClarificationResponse = ClarificationResponse;
