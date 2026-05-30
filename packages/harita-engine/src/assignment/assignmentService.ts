import { createAdminClient } from "@/lib/supabase/admin";

export type AssignmentPayload = {
  projectId: string;
  projectCreditId: string;
  documentType: string;
  assigneeRole: string;
  assigneeUserId?: string;
  actorId?: string;
};

export const assignmentService = {
  async assignTask(payload: AssignmentPayload) {
    const admin = createAdminClient();
    
    // Inactivate any previous assignment for the same document type on this credit
    await admin
      .from("assignments")
      .update({ is_active: false })
      .match({
        project_id: payload.projectId,
        project_credit_id: payload.projectCreditId,
        document_type: payload.documentType,
        is_active: true,
      });

    // Create the new active assignment
    const { data: assignment, error } = await admin
      .from("assignments")
      .insert({
        project_id: payload.projectId,
        project_credit_id: payload.projectCreditId,
        document_type: payload.documentType,
        role: payload.assigneeRole,
        user_id: payload.assigneeUserId,
        is_active: true,
        assigned_by: payload.actorId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return assignment;
  },

  async getActiveAssignments(projectId: string) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("assignments")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_active", true);

    if (error) throw new Error(error.message);
    return data;
  }
};
