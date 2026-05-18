export interface TimelinePredictionInput {
  creditCode: string;
  historicalClarificationsCount: number;
  reviewerVelocityIndex: number; // 1 to 10 (higher is faster)
  supplierResponseDelayDays: number;
  documentIntegrityQuality: number; // 0 to 100
}

export interface PredictiveCriticalPath {
  targetApprovalDate: string;
  reviewerCongestionFactor: number; // 0 to 10
  criticalPathDelayDays: number;
  stalledRiskLevel: "LOW" | "MEDIUM" | "HIGH";
  hotspots: string[];
}

export class ExecutionTimelinePredictor {
  /**
   * Generates confidence-adjusted green submittal approval schedules and highlights hotspots
   */
  static predictTimeline(input: TimelinePredictionInput): PredictiveCriticalPath {
    let delayDays = 5; // baseline execution delay in days

    // 1. Incorporate historic clarification counts
    delayDays += input.historicalClarificationsCount * 4.5;

    // 2. Adjust for reviewer backlog congestion
    const reviewerCongestionFactor = parseFloat(Math.max(1, 10 - input.reviewerVelocityIndex).toFixed(1));
    delayDays += reviewerCongestionFactor * 1.5;

    // 3. Supplier communication delays
    delayDays += input.supplierResponseDelayDays;

    // 4. Quality multipliers
    if (input.documentIntegrityQuality < 70) {
      delayDays += (70 - input.documentIntegrityQuality) * 0.4;
    }

    const totalDaysToAdd = Math.round(delayDays);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + totalDaysToAdd);

    // Identify risk severity
    let stalledRiskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    if (totalDaysToAdd > 25) {
      stalledRiskLevel = "HIGH";
    } else if (totalDaysToAdd > 12) {
      stalledRiskLevel = "MEDIUM";
    }

    // Capture hotspots
    const hotspots: string[] = [];
    if (input.historicalClarificationsCount > 2) {
      hotspots.push("Clarification Frequency Drift");
    }
    if (reviewerCongestionFactor > 6) {
      hotspots.push("Auditor Backlog Congestion");
    }
    if (input.documentIntegrityQuality < 60) {
      hotspots.push("Weak Ingestion Evidence Integrity");
    }

    return {
      targetApprovalDate: targetDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }),
      reviewerCongestionFactor,
      criticalPathDelayDays: totalDaysToAdd,
      stalledRiskLevel,
      hotspots
    };
  }
}
