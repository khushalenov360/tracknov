"use strict";
/**
 * Tracknov Extraction Feedback - Extraction Correction Logger
 * Orchestrates logging, failure classification, and confidence recalibration.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractionCorrectionLogger = void 0;
const admin_1 = require("@/lib/supabase/admin");
const reviewerCorrectionDiffEngine_1 = require("../../document-intelligence/reviewerCorrectionDiffEngine");
const semanticFailureClassifier_1 = require("../../document-intelligence/semanticFailureClassifier");
const extractionConfidenceAdjuster_1 = require("./extractionConfidenceAdjuster");
class ExtractionCorrectionLogger {
    /**
     * Captures human reviewer corrections, classifies failures, and logs telemetry.
     */
    static logCorrection(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const diff = reviewerCorrectionDiffEngine_1.ReviewerCorrectionDiffEngine.compare(params.originalValue, params.correctedValue);
                const failureType = semanticFailureClassifier_1.SemanticFailureClassifier.classify(params.extractionType, params.originalValue, params.correctedValue, diff);
                const supabase = (0, admin_1.createAdminClient)();
                // Retrieve existing correction logs count for dynamic confidence calibration
                const { count } = yield supabase
                    .from("extraction_corrections")
                    .select("*", { count: "exact", head: true })
                    .eq("document_id", params.documentId);
                const totalCorrections = (count || 0) + 1;
                const recalibratedConfidence = extractionConfidenceAdjuster_1.ExtractionConfidenceAdjuster.calculateRecalibratedConfidence(params.currentConfidence, totalCorrections, failureType);
                // Persist the correction log
                const { error: correctionError } = yield supabase.from("extraction_corrections").insert({
                    project_id: params.projectId,
                    document_id: params.documentId,
                    extraction_type: params.extractionType,
                    original_value: params.originalValue,
                    corrected_value: params.correctedValue,
                    correction_reason: params.correctionReason,
                    reviewer_id: params.reviewerId,
                    trace_id: params.traceId || undefined,
                    replay_hash: params.replayHash || undefined,
                });
                if (correctionError) {
                    console.error("Failed to insert extraction correction:", correctionError);
                    return { success: false, failureType, recalibratedConfidence: params.currentConfidence };
                }
                // Log failure classification event
                yield supabase.from("semantic_failure_events").insert({
                    document_id: params.documentId,
                    failure_type: failureType,
                    failure_description: `Reviewer override on ${params.extractionType}: "${params.originalValue}" -> "${params.correctedValue}"`,
                    trace_id: params.traceId || undefined,
                });
                // Log the confidence recalibration event
                yield supabase.from("confidence_recalibration_logs").insert({
                    extraction_type: params.extractionType,
                    previous_confidence: params.currentConfidence,
                    adjusted_confidence: recalibratedConfidence,
                    reason: `Auto-recalibrated following classification of type ${failureType}`,
                });
                return { success: true, failureType, recalibratedConfidence };
            }
            catch (err) {
                console.error("Error in ExtractionCorrectionLogger:", err);
                return { success: false, failureType: "OCR_NOISE", recalibratedConfidence: params.currentConfidence };
            }
        });
    }
}
exports.ExtractionCorrectionLogger = ExtractionCorrectionLogger;
