"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrictionAnalyticsEngine = void 0;
class FrictionAnalyticsEngine {
    /**
     * Assesses frustration metrics using rage clicks and hesitation records
     */
    static calculateFriction(rageClicksCount, uploadRetries, hesitationSeconds) {
        let onboardingAbandonmentChance = Math.min(100, rageClicksCount * 12 + uploadRetries * 8);
        let clarificationConfusionIndex = Math.min(100, Math.round(hesitationSeconds * 2.4));
        let uploadFrictionLevel = "LOW";
        if (uploadRetries > 4) {
            uploadFrictionLevel = "HIGH";
        }
        else if (uploadRetries > 1) {
            uploadFrictionLevel = "MEDIUM";
        }
        return {
            onboardingAbandonmentChance,
            uploadFrictionLevel,
            clarificationConfusionIndex
        };
    }
}
exports.FrictionAnalyticsEngine = FrictionAnalyticsEngine;
