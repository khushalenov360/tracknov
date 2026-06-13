export interface HesitationAudit {
  submittalId: string;
  dwellSeconds: number;
  hoverCount: number;
  cognitiveFrictionRisk: "LOW" | "MODERATE" | "HIGH";
}

export class ReviewerHesitationTracker {
  /**
   * Evaluates auditor activity durations to predict submittal approval bottlenecks
   */
  static analyzeHesitation(submittalId: string, dwellSeconds: number, hoverCount: number): HesitationAudit {
    let cognitiveFrictionRisk: HesitationAudit["cognitiveFrictionRisk"] = "LOW";

    // High dwell times with low interaction indicate confusion
    if (dwellSeconds > 180 && hoverCount < 4) {
      cognitiveFrictionRisk = "HIGH";
    } else if (dwellSeconds > 60) {
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
