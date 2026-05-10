import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    await db.rpc("recalculate_submittal_state", { p_submittal_id: submittalId });

    // After updating submittal, update the parent stage
    const { data: submittal } = await db
      .from("submittals")
      .select("credit_stage_id, project_credit_id")
      .eq("id", submittalId)
      .single();
    
    if (submittal?.credit_stage_id) {
      await this.recalculateStageState(submittal.credit_stage_id, db, submittal.project_credit_id ?? null);
    }
  }

  async recalculateStageState(stageId: string, writer?: SupabaseClient, projectCreditId?: string | null) {
    const db = writer || this.admin;
    let effectiveProjectCreditId = projectCreditId ?? null;
    if (!effectiveProjectCreditId) {
      const { data: stage } = await db
        .from("credit_stages")
        .select("project_credit_id")
        .eq("id", stageId)
        .maybeSingle();
      effectiveProjectCreditId = stage?.project_credit_id ?? null;
    }
    if (effectiveProjectCreditId) {
      await db.rpc("recalculate_credit_state", { p_project_credit_id: effectiveProjectCreditId });
    }
  }
}

export const submittalService = new SubmittalService();
