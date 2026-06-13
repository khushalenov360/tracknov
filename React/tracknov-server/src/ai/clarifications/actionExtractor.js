"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionExtractor = void 0;
class ActionExtractor {
    extract(comment, intent) {
        if (intent.requestType === 'missing_evidence') {
            return [{ action: 'UPLOAD_DOCUMENT', details: intent.evidenceType }];
        }
        return [];
    }
}
exports.ActionExtractor = ActionExtractor;
