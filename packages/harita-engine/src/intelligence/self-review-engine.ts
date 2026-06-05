import { HallucinationDetector, HallucinationCheck } from "./hallucination-detector";

export interface SelfReviewResult {
  approved: boolean;
  confidence: number;
  violations: string[];
  reviewSummary: string;
}

export class SelfReviewEngine {
  public static reviewResponse(response: string, projectId: string): SelfReviewResult {
    const checks: HallucinationCheck[] = HallucinationDetector.verifyClaims(response, projectId);
    
    const violations: string[] = [];
    
    checks.forEach(check => {
      if (!check.verified && check.hallucinatedEntity) {
        violations.push(`Hallucinated Entity Detected: ${check.hallucinatedEntity}`);
      }
    });

    // Check basic structural rules
    if (response.includes("BLOCKED") && !response.includes("due to")) {
      // Just a simple guardrail heuristic
      violations.push("Claimed BLOCKED but did not specify the reason.");
    }

    if (violations.length > 0) {
      return {
        approved: false,
        confidence: 0,
        violations,
        reviewSummary: `Blocked due to ${violations.length} violation(s).`
      };
    }

    return {
      approved: true,
      confidence: 95,
      violations: [],
      reviewSummary: "Response validated against assignment and evidence graphs."
    };
  }
}
