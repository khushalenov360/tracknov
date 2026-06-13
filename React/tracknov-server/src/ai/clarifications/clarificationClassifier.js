"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClarificationClassifier = void 0;
class ClarificationClassifier {
    classify(parsedIntent) {
        if (parsedIntent.requestType === 'missing_evidence') {
            return 'DOCUMENT_UPLOAD_REQUIRED';
        }
        return 'EXPLANATION_REQUIRED';
    }
}
exports.ClarificationClassifier = ClarificationClassifier;
