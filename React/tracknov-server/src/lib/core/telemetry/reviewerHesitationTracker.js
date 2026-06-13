"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewerHesitationTracker = void 0;
class ReviewerHesitationTracker {
    /**
     * Evaluates auditor activity durations to predict submittal approval bottlenecks
     */
    static analyzeHesitation(submittalId, dwellSeconds, hoverCount) {
        let cognitiveFrictionRisk = "LOW";
        // High dwell times with low interaction indicate confusion
        if (dwellSeconds > 180 && hoverCount < 4) {
            cognitiveFrictionRisk = "HIGH";
        }
        else if (dwellSeconds > 60) {
            cognitiveFrictionRisk = "MODERATE";
        }
        return {
            submittalId,
            dwellSeconds,
            hoverCount,
            cognitiveFrictionRisk
        };
    }
}
exports.ReviewerHesitationTracker = ReviewerHesitationTracker;
