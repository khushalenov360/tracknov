/**
 * Tracknov Extraction Feedback - Extraction Correction Logger
 * Orchestrates logging, failure classification, and confidence recalibration.
 */

import { createAdminClient } from "../../supabase/admin";
import { ReviewerCorrectionDiffEngine } from "../../document-intelligence/reviewerCorrectionDiffEngine";
import { SemanticFailureClassifier } from "../../document-intelligence/semanticFailureClassifier";
import { ExtractionConfidenceAdjuster } from "./extractionConfidenceAdjuster";

export interface CorrectionParams {
  projectId: string;
  documentId: string;
  extractionType: "OCR" | "TABLE" | "SEMANTIC_TAG" | "DUPLICATE_DETECTION" | "CLARIFICATION";
  originalValue: string;
  correctedValue: string;
  correctionReason: string;
  reviewerId: string;
  currentConfidence: number;
  traceId?: string;
  replayHash?: string;
}

export interface CorrectionResult {
  success: boolean;
  failureType: string;
  recalibratedConfidence: number;
}

export class ExtractionCorrectionLogger {
  /**
   * Captures human reviewer corrections, classifies failures, and logs telemetry.
   */
  public static async logCorrection(params: CorrectionParams): Promise<CorrectionResult> {
    try {
      const diff = ReviewerCorrectionDiffEngine.compare(params.originalValue, params.correctedValue);
      const failureType = SemanticFailureClassifier.classify(
        params.extractionType,
        params.originalValue,
        params.correctedValue,
        diff
      );

      const supabase = createAdminClient();

      // Retrieve existing correction logs count for dynamic confidence calibration
      const { count } = await supabase
        .from("extraction_corrections")
        .select("*", { count: "exact", head: true })
        .eq("document_id", params.documentId);

      const totalCorrections = (count || 0) + 1;
      const recalibratedConfidence = ExtractionConfidenceAdjuster.calculateRecalibratedConfidence(
        params.currentConfidence,
        totalCorrections,
        failureType
      );

      // Persist the correction log
      const { error: correctionError } = await supabase.from("extraction_corrections").insert({
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
      await supabase.from("semantic_failure_events").insert({
        document_id: params.documentId,
        failure_type: failureType,
        failure_description: `Reviewer override on ${params.extractionType}: "${params.originalValue}" -> "${params.correctedValue}"`,
        trace_id: params.traceId || undefined,
      });

      // Log the confidence recalibration event
      await supabase.from("confidence_recalibration_logs").insert({
        extraction_type: params.extractionType,
        previous_confidence: params.currentConfidence,
        adjusted_confidence: recalibratedConfidence,
        reason: `Auto-recalibrated following classification of type ${failureType}`,
      });

      return { success: true, failureType, recalibratedConfidence };
    } catch (err) {
      console.error("Error in ExtractionCorrectionLogger:", err);
      return { success: false, failureType: "OCR_NOISE", recalibratedConfidence: params.currentConfidence };
    }
  }
}
