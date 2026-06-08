export interface CustomerHealthMetrics {
  onboardingCompletion: number; // 0 to 100
  activationVelocity: number; // 0 to 10
  aiAcceptanceRate: number; // 0 to 100
  clarificationFrequency: number; // count per week
  uploadRetries: number; // count
  reviewerDelaysHours: number; // hours
  exportFrequency: number; // count per week
  sessionAbandonmentCount: number; // count
  supportDependenceCount: number; // count
}

export interface ChurnPredictionResult {
  customerHealthScore: number; // 0 to 100
  churnProbability: number; // 0 to 100
  activationRisk: "LOW" | "MEDIUM" | "HIGH";
  supportDependencyIndex: number; // 0 to 10
}

export class CustomerHealthEngine {
  /**
   * Computes pilot tenant churn risk, active friction levels, and support dependency metrics
   */
  static calculateHealth(metrics: CustomerHealthMetrics): ChurnPredictionResult {
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
    let activationRisk: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    if (customerHealthScore < 45) {
      activationRisk = "HIGH";
    } else if (customerHealthScore < 75) {
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
