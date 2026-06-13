"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationJustification = void 0;
class RecommendationJustification {
    justify(action, context) {
        if (action.includes('HVAC')) {
            return 'Required to calculate baseline energy performance and demonstrate 10% savings.';
        }
        return 'Improves overall project readiness by satisfying documentation requirements.';
    }
}
exports.RecommendationJustification = RecommendationJustification;
