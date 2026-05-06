import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

type OpenTaskStatus = "open" | "in_progress";

export class TaskService {
  private get client() {
    return createClient();
  }

  private get admin() {
    return env.supabaseServiceRoleKey ? createAdminClient() : this.client;
  }

  async upsertAssignmentUploadTask(params: {
    projectId: string;
    projectCreditId: string;
    assignedUserId: string;
    createdBy?: string | null;
    title: string;
    description?: string;
    priority?: "high" | "medium" | "low";
  }) {
    const { data: existing } = await this.admin
      .from("project_tasks")
      .select("id")
      .eq("project_id", params.projectId)
      .eq("project_credit_id", params.projectCreditId)
      .eq("assigned_user_id", params.assignedUserId)
      .eq("task_type", "assignment_upload")
      .in("status", ["open", "in_progress"] as OpenTaskStatus[])
      .maybeSingle();

    if (existing?.id) return existing.id;

    const { data, error } = await this.admin
      .from("project_tasks")
      .insert({
        project_id: params.projectId,
        project_credit_id: params.projectCreditId,
        task_type: "assignment_upload",
        title: params.title,
        description: params.description ?? null,
        assigned_user_id: params.assignedUserId,
        created_by: params.createdBy ?? null,
        priority: params.priority ?? "medium",
        status: "open",
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  async closeAssignmentTasks(params: {
    projectId: string;
    projectCreditId: string;
    assignedUserId?: string | null;
  }) {
    let query = this.admin
      .from("project_tasks")
      .update({
        status: "done",
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", params.projectId)
      .eq("project_credit_id", params.projectCreditId)
      .eq("task_type", "assignment_upload")
      .in("status", ["open", "in_progress"]);

    if (params.assignedUserId) {
      query = query.eq("assigned_user_id", params.assignedUserId);
    }

    await query;
  }

  async upsertClarificationTask(params: {
    projectId: string;
    documentId: string;
    assignedUserId: string;
    createdBy?: string | null;
    title: string;
    description?: string;
  }) {
    const { data: existing } = await this.admin
      .from("project_tasks")
      .select("id")
      .eq("project_id", params.projectId)
      .eq("document_id", params.documentId)
      .eq("assigned_user_id", params.assignedUserId)
      .eq("task_type", "clarification_fix")
      .in("status", ["open", "in_progress"] as OpenTaskStatus[])
      .maybeSingle();

    if (existing?.id) return existing.id;

    const { data, error } = await this.admin
      .from("project_tasks")
      .insert({
        project_id: params.projectId,
        document_id: params.documentId,
        task_type: "clarification_fix",
        title: params.title,
        description: params.description ?? null,
        assigned_user_id: params.assignedUserId,
        created_by: params.createdBy ?? null,
        priority: "high",
        status: "open",
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  async closeClarificationTasks(params: {
    projectId: string;
    documentId: string;
    assignedUserId?: string | null;
  }) {
    let query = this.admin
      .from("project_tasks")
      .update({
        status: "done",
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", params.projectId)
      .eq("document_id", params.documentId)
      .eq("task_type", "clarification_fix")
      .in("status", ["open", "in_progress"]);

    if (params.assignedUserId) {
      query = query.eq("assigned_user_id", params.assignedUserId);
    }
    await query;
  }
}

export const taskService = new TaskService();
