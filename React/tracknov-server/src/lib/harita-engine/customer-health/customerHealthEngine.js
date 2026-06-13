"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerHealthEngine = void 0;
class CustomerHealthEngine {
    /**
     * Computes pilot tenant churn risk, active friction levels, and support dependency metrics
     */
    static calculateHealth(metrics) {
        // 1. Compute Base Health Score (higher is better)
        let health = 100;
        // Low onboarding completion reduces health
        health -= (100 - metrics.onboardingCompletion) * 0.25;
        // High upload retries indicate ingestion frustration
        health -= Math.min(25, metrics.uploadRetries * 3);
        // Reviewer latency blocks project momentum
        health -= Math.min(20, (metrics.reviewerDelaysHours / 24) * 2);
        // Session abandonment indicates UX confusion
        health -= Math.min(15, metrics.sessionAbandonmentCount * 2.5);
        const customerHealthScore = Math.max(0, Math.min(100, Math.round(health)));
        // 2. Compute Churn Probability (higher is worse)
        let churn = 100 - customerHealthScore;
        if (metrics.exportFrequency === 0) {
            churn += 15; // Lack of exports indicates client is not getting output value
        }
        if (metrics.activationVelocity < 3) {
            churn += 10; // Slow startup signals low engagement
        }
        const churnProbability = Math.max(0, Math.min(100, Math.round(churn)));
        // 3. Compute Activation Risk Category
        let activationRisk = "LOW";
        if (customerHealthScore < 45) {
            activationRisk = "HIGH";
        }
        else if (customerHealthScore < 75) {
            activationRisk = "MEDIUM";
        }
        // 4. Compute Support Dependency Index (0 to 10, higher means customer leans heavily on support)
        const supportIndex = (metrics.supportDependenceCount * 1.5) + (metrics.uploadRetries * 0.4);
        const supportDependencyIndex = parseFloat(Math.min(10, Math.max(0, supportIndex)).toFixed(1));
        return {
            customerHealthScore,
            churnProbability,
            activationRisk,
            supportDependencyIndex,
        };
    }
}
exports.CustomerHealthEngine = CustomerHealthEngine;
