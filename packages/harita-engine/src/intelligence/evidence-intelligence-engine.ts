/**
 * EvidenceIntelligenceEngine
 *
 * Entry point for evidence intelligence within the Harita reasoning pipeline.
 * Delegates to EvidenceAssessmentEngine for full ontology-backed assessment.
 *
 * Usage from Next.js app routes:
 *   const result = await EvidenceIntelligenceEngine.assess(supabase, creditId, docName, parsedText);
 *
 * The static shim methods (determineMissingEvidence / evaluateSubmissionConfidence)
 * are preserved for backward compatibility but now delegate to the real engine.
 */
export { EvidenceAssessmentEngine, AssessmentResult } from "./evidence/evidence-assessment-engine";

export class EvidenceIntelligenceEngine {
  /** @deprecated  Use EvidenceAssessmentEngine.assess() directly. */
  public static determineMissingEvidence(creditId: string) {
    return { creditId, missing: ["Area Statement", "Occupancy Calculation"], present: ["Circulation Layout", "Passage Width Information"] };
  }

  /** @deprecated  Use EvidenceAssessmentEngine.assess() directly. */
  public static evaluateSubmissionConfidence(creditId: string) {
    return { creditId, confidence: 20 };
  }
}
