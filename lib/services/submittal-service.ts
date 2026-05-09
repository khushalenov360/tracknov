import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WorkflowState } from "./document-state-service";

type SupabaseClient = ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>;

export class SubmittalService {
  private client: SupabaseClient;
  private admin: SupabaseClient;

  constructor() {
    this.client = createClient();
    this.admin = createAdminClient();
  }

  /**
   * Validates if a submittal can transition to a target state based on its documents.
   * This is the 'Gate' logic.
   */
  async validateSubmittalGate(submittalId: string): Promise<{ ok: boolean; message?: string }> {
    const { data: documents } = await this.admin
      .from("project_document")
      .select("state, workflow_state, is_latest")
      .eq("submittal_id", submittalId)
      .eq("is_latest", true);

    if (!documents || documents.length === 0) {
      return { ok: false, message: "No documents found for this submittal." };
    }

    const allApproved = documents.every(d => (d.workflow_state || d.state) === "APPROVED");
    if (!allApproved) {
      const pendingCount = documents.filter(d => (d.workflow_state || d.state) !== "APPROVED").length;
      return { ok: false, message: `${pendingCount} documents are still pending approval.` };
    }

    return { ok: true };
  }

  /**
   * Recalculates the submittal state based on its documents.
   */
  async recalculateSubmittalState(submittalId: string, writer?: SupabaseClient) {
    const db = writer || this.admin;
    const { data: documents } = await db
      .from("project_document")
      .select("workflow_state, is_latest")
      .eq("submittal_id", submittalId)
      .eq("is_latest", true);

    if (!documents) return;

    let newState: WorkflowState = "DRAFT";
    if (documents.length > 0) {
      if (documents.every(d => d.workflow_state === "APPROVED")) {
        newState = "APPROVED";
      } else if (documents.some(d => d.workflow_state === "REJECTED" || d.workflow_state === "ELIMINATED")) {
        newState = "REJECTED";
      } else if (documents.some(d => d.workflow_state === "UNDER_REVIEW")) {
        newState = "UNDER_REVIEW";
      } else if (documents.some(d => d.workflow_state === "SUBMITTED")) {
        newState = "SUBMITTED";
      } else if (documents.some(d => d.workflow_state === "READY")) {
        newState = "READY";
      }
    }

    await db
      .from("submittals")
      .update({ state: newState, updated_at: new Date().toISOString() })
      .eq("id", submittalId);

    // After updating submittal, update the parent stage
    const { data: submittal } = await db
      .from("submittals")
      .select("credit_stage_id")
      .eq("id", submittalId)
      .single();
    
    if (submittal?.credit_stage_id) {
      await this.recalculateStageState(submittal.credit_stage_id, db);
    }
  }

  async recalculateStageState(stageId: string, writer?: SupabaseClient) {
    const db = writer || this.admin;
    const { data: submittals } = await db
      .from("submittals")
      .select("state")
      .eq("credit_stage_id", stageId);

    if (!submittals) return;

    let newState: WorkflowState = "DRAFT";
    if (submittals.length > 0) {
      if (submittals.every(s => s.state === "APPROVED")) {
        newState = "APPROVED";
      } else if (submittals.some(s => s.state === "REJECTED")) {
        newState = "REJECTED";
      } else if (submittals.some(s => s.state === "UNDER_REVIEW")) {
        newState = "UNDER_REVIEW";
      } else if (submittals.some(s => s.state === "SUBMITTED")) {
        newState = "SUBMITTED";
      }
    }

    await db
      .from("credit_stages")
      .update({ state: newState, updated_at: new Date().toISOString() })
      .eq("id", stageId);
  }
}

export const submittalService = new SubmittalService();
