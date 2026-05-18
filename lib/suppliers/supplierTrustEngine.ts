export interface SupplierTrustMetric {
  supplierId: string;
  name: string;
  category: string;
  approvalsCount: number;
  rejectionsCount: number;
  averageClarificationLoops: number;
  evidenceFreshnessDays: number;
}

export interface SupplierTrustScoreDetail {
  trustIndexScore: number; // 0 to 100
  reviewerTrustLevel: "ELITE" | "VERIFIED" | "STANDARD" | "CAUTION";
  successRate: number; // %
  loopsAverages: number;
}

export class SupplierTrustEngine {
  /**
   * Calculates the overall corporate audit trust coefficient for a supplier
   */
  static calculateTrustScore(metric: SupplierTrustMetric): SupplierTrustScoreDetail {
    const totalSubmittals = metric.approvalsCount + metric.rejectionsCount;
    const successRate = totalSubmittals > 0 
      ? Math.round((metric.approvalsCount / totalSubmittals) * 100)
      : 100;

    // 1. Base Score calculation
    let score = successRate * 0.7;

    // 2. Clarification loops deduction
    score -= Math.min(20, metric.averageClarificationLoops * 4);

    // 3. Evidence freshness adjustment
    if (metric.evidenceFreshnessDays > 365) {
      score -= 10; // Deduct for expired or stale documents
    } else {
      score += 10; // Freshness bonus
    }

    const trustIndexScore = Math.max(0, Math.min(100, Math.round(score)));

    // 4. Classify reviewer trust levels
    let reviewerTrustLevel: "ELITE" | "VERIFIED" | "STANDARD" | "CAUTION" = "STANDARD";
    if (trustIndexScore >= 90 && metric.averageClarificationLoops <= 0.5) {
      reviewerTrustLevel = "ELITE";
    } else if (trustIndexScore >= 75) {
      reviewerTrustLevel = "VERIFIED";
    } else if (trustIndexScore < 50) {
      reviewerTrustLevel = "CAUTION";
    }

    return {
      trustIndexScore,
      reviewerTrustLevel,
      successRate,
      loopsAverages: metric.averageClarificationLoops
    };
  }
}
