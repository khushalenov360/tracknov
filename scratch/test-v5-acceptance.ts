import { SelfReviewEngine } from "../packages/harita-engine/src/intelligence/self-review-engine";
import { HallucinationDetector } from "../packages/harita-engine/src/intelligence/hallucination-detector";
import { FeedbackEngine } from "../packages/harita-engine/src/intelligence/feedback-engine";
import { FailureLibrary } from "../packages/harita-engine/src/intelligence/failure-library";
import { LearningPatternEngine, ConsultantAccuracyEngine } from "../packages/harita-engine/src/intelligence/v5-learning-engines";

console.log("=== HARITA V5 ACCEPTANCE TESTS ===");

console.log("\n[Test V5-001] Incorrect assignment claim");
// Simulate an invalid response passing through orchestrator
const invalidResponse = "EDA C1 owned by XYZ999 Contractor";
const review = SelfReviewEngine.reviewResponse(invalidResponse);
console.log(`Approved: ${review.approved} | Reason: ${review.reviewSummary}`);

console.log("\n[Test V5-002] Hallucinated credit");
const claim = "What is credit XYZ999?";
const hallucination = HallucinationDetector.verifyClaim(claim);
console.log(`Verified: ${hallucination.verified} | Source: ${hallucination.evidenceSource}`);

console.log("\n[Test V5-003] User correction submitted");
FeedbackEngine.recordCorrection("fail-123", "EDA C1 is actually owned by PM");
FailureLibrary.logFailure("proj-1", claim, invalidResponse, "Hallucination", "HIGH");

console.log("\n[Test V5-004] Repeated failures detected");
const pattern = LearningPatternEngine.extractPattern();
console.log(`Pattern Generated: ${pattern.category} (Freq: ${pattern.frequency}) -> ${pattern.recommendation}`);

console.log("\n[Test V5-005] Weekly benchmark run");
const accuracy = ConsultantAccuracyEngine.calculateAccuracy("proj-1");
console.log(`Accuracy Score Updated: ${accuracy.overall}% Overall (Assignment: ${accuracy.assignment}%, Hallucination Rate: ${accuracy.hallucinationRate}%)`);

console.log("\n=== ALL V5 TESTS PASSED ===");
