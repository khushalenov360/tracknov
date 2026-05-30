/**
 * Tracknov Extraction Feedback - Reviewer Override Tracker
 * Persists auditor override logs of AI warnings or rules.
 */

import { createAdminClient } from "../supabase/admin";

export interface OverrideParams {
  projectId: string;
  documentId: string;
  overrideType: string;
  overrideReason: string;
  traceId?: string;
}

export class ReviewerOverrideTracker {
  /**
   * Logs a reviewer override event in the database for accuracy telemetry.
   */
  public static async logOverride(params: OverrideParams): Promise<boolean> {
    try {
      const supabase = createAdminClient();
      const { error } = await supabase.from("reviewer_override_events").insert({
        project_id: params.projectId,
        document_id: params.documentId,
        override_type: params.overrideType,
        override_reason: params.overrideReason,
        trace_id: params.traceId || undefined,
      });

      if (error) {
        console.error("Failed to insert override event:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Error in ReviewerOverrideTracker:", err);
      return false;
    }
  }
}
