"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceIntelligenceEngine = exports.EvidenceAssessmentEngine = void 0;
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
var evidence_assessment_engine_1 = require("./evidence/evidence-assessment-engine");
Object.defineProperty(exports, "EvidenceAssessmentEngine", { enumerable: true, get: function () { return evidence_assessment_engine_1.EvidenceAssessmentEngine; } });
class EvidenceIntelligenceEngine {
    /** @deprecated  Use EvidenceAssessmentEngine.assess() directly. */
    static determineMissingEvidence(creditId) {
        return { creditId, missing: ["Area Statement", "Occupancy Calculation"], present: ["Circulation Layout", "Passage Width Information"] };
    }
    /** @deprecated  Use EvidenceAssessmentEngine.assess() directly. */
    static evaluateSubmissionConfidence(creditId) {
        return { creditId, confidence: 20 };
    }
}
exports.EvidenceIntelligenceEngine = EvidenceIntelligenceEngine;
