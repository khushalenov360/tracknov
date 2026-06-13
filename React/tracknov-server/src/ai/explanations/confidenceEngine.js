"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfidenceEngine = void 0;
class ConfidenceEngine {
    calculate(action, context) {
        if (context.hasMandatoryBaseline)
            return 98;
        if (context.isOptionalCredit)
            return 85;
        return 90;
    }
}
exports.ConfidenceEngine = ConfidenceEngine;
