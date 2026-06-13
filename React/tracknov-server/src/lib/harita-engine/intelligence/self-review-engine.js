"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelfReviewEngine = void 0;
const hallucination_detector_1 = require("./hallucination-detector");
class SelfReviewEngine {
    static reviewResponse(response, projectId) {
        const checks = hallucination_detector_1.HallucinationDetector.verifyClaims(response, projectId);
        const violations = [];
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
exports.SelfReviewEngine = SelfReviewEngine;
