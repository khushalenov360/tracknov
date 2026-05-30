export interface RiskFactors {
  onboardingAbandoned: boolean;
  failedUploadCount: number;
  stalledClarificationLoops: number;
  reviewerInactivityDays: number;
  lowAiTrustIncidentCount: number; // e.g. user repeatedly manually overriding AI fields
  exportGenerationRetries: number;
  supportTicketSpike: boolean;
  inactivityDays: number;
}

export interface CustomerHealthReport {
  score: number; // 0 to 100
  status: "GREEN" | "YELLOW" | "RED";
  riskDescription: string;
  contributingFactors: string[];
}

export class CustomerRiskEngine {
  /**
   * Computes health score and classifies churn risk for pilot customers
   */
  static analyzeHealth(factors: RiskFactors): CustomerHealthReport {
    let riskPoints = 0;
    const contributingFactors: string[] = [];

    if (factors.onboardingAbandoned) {
      riskPoints += 50;
      contributingFactors.push("Abandoned activation wizard before completion.");
    }

    if (factors.failedUploadCount >= 5) {
      riskPoints += 25;
      contributingFactors.push("Frequent document upload errors causing user frustration.");
    } else if (factors.failedUploadCount >= 3) {
      riskPoints += 10;
    }

    if (factors.stalledClarificationLoops >= 3) {
      riskPoints += 30;
      contributingFactors.push("Multiple submittals stalled in back-and-forth review loops.");
    }

    if (factors.reviewerInactivityDays >= 10) {
      riskPoints += 25;
      contributingFactors.push("Audit reviewer inactive for over 10 consecutive days.");
    }

    if (factors.lowAiTrustIncidentCount >= 4) {
      riskPoints += 15;
      contributingFactors.push("High volume of manual AI verification overrides.");
    }

    if (factors.exportGenerationRetries >= 3) {
      riskPoints += 15;
      contributingFactors.push("Multiple retries while attempting final certification export.");
    }

    if (factors.supportTicketSpike) {
      riskPoints += 20;
      contributingFactors.push("Spike in helpdesk queries indicating operational confusion.");
    }

    if (factors.inactivityDays >= 14) {
      riskPoints += 40;
      contributingFactors.push("Zero portal engagement for over 14 consecutive days.");
    } else if (factors.inactivityDays >= 7) {
      riskPoints += 20;
      contributingFactors.push("No portal activity in the last 7 days.");
    }

    // Health Score is 100 - risk points
    const score = Math.max(0, 100 - riskPoints);

    let status: CustomerHealthReport["status"] = "GREEN";
    let riskDescription = "Excellent engagement. Customer Zero is active, workflows are flowing cleanly, and support deflection is optimal.";

    if (score < 40) {
      status = "RED";
      riskDescription = "Critical Churn Risk! Very high probability of project abandonment within the next 30 days. Immediate administrative action highly recommended.";
    } else if (score < 75) {
      status = "YELLOW";
      riskDescription = "At-Risk Warning. Pilot indicators show minor friction points in upload pipelines or stalled auditor response. Reach out with proactive guidance.";
    }

    return {
      score,
      status,
      riskDescription,
      contributingFactors,
    };
  }
}
