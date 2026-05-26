import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TaskState = "ASSIGNED" | "DELEGATED" | "IN_PROGRESS" | "UPLOADED" | "UNDER_REVIEW" | "CLARIFICATION" | "APPROVED" | "REJECTED";

export interface TaskParams {
  projectId: string;
  creditId?: string;
  submittalId?: string;
  taskType: string;
  assignedBy: string;
  assignedTo: string;
  priority?: TaskPriority;
  docType?: string;
}

export interface ClarificationTaskParams {
  projectId: string;
  documentId: string;
  assignedUserId: string;
  createdBy?: string | null;
  title?: string;
  description?: string;
}

export class TaskService {
  private get client() { return createClient(); }
  private get admin() { return env.supabaseServiceRoleKey ? createAdminClient() : this.client; }

  /**
   * Logs an action in the task audit trail.
   */
  async logTaskHistory(client: any, params: {
    taskId: string;
    actionType: string;
    performedBy: string;
    oldState?: string;
    newState?: string;
    oldAssignee?: string;
    newAssignee?: string;
    notes?: string;
  }) {
    const { error } = await client.from("task_history").insert({
      task_id: params.taskId,
      action_type: params.actionType,
      performed_by: params.performedBy,
      old_state: params.oldState,
      new_state: params.newState,
      old_assignee: params.oldAssignee,
      new_assignee: params.newAssignee,
      notes: params.notes,
    });
    if (error) {
      // Silently fail task history logging to not interrupt main flow
    }
  }

  /**
   * Creates a new task and its initial history record.
   */
  async createTask(params: TaskParams) {
    const { data: task, error } = await this.admin
      .from("tasks")
      .insert({
        project_id: params.projectId,
        project_credit_id: params.creditId,
        submittal_id: params.submittalId,
        task_type: params.taskType,
        assigned_by: params.assignedBy,
        assigned_to: params.assignedTo,
        accountable_user_id: params.assignedTo, // Initially, the assignee is accountable
        priority: params.priority || "MEDIUM",
        doc_type: params.docType,
        task_status: "ASSIGNED",
        workflow_state: "DRAFT",
        active_flag: true,
      })
      .select("id")
      .single();

    if (error) throw error;

    await this.logTaskHistory(this.admin, {
      taskId: task.id,
      actionType: "created",
      performedBy: params.assignedBy,
      newAssignee: params.assignedTo,
      newState: "ASSIGNED",
    });

    return task;
  }

  /**
   * Delegates a task to another user, maintaining accountability.
   */
  async delegateTask(taskId: string, delegatedBy: string, delegatedTo: string) {
    const { data: task, error: fetchError } = await this.admin
      .from("tasks")
      .select("assigned_to, task_status")
      .eq("id", taskId)
      .single();

    if (fetchError) throw fetchError;

    const { error: updateError } = await this.admin
      .from("tasks")
      .update({
        assigned_to: delegatedTo,
        delegated_by: delegatedBy,
        delegated_from: task.assigned_to,
        task_status: "DELEGATED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (updateError) throw updateError;

    await this.logTaskHistory(this.admin, {
      taskId,
      actionType: "delegated",
      performedBy: delegatedBy,
      oldAssignee: task.assigned_to,
      newAssignee: delegatedTo,
      oldState: task.task_status,
      newState: "DELEGATED",
    });
  }

  /**
   * Updates the state/status of a task.
   */
  async updateTaskState(taskId: string, performedBy: string, params: {
    status?: TaskState;
    workflowState?: string;
    notes?: string;
  }) {
    const { data: task, error: fetchError } = await this.admin
      .from("tasks")
      .select("task_status, workflow_state")
      .eq("id", taskId)
      .single();

    if (fetchError) throw fetchError;

    const updates: any = { updated_at: new Date().toISOString() };
    if (params.status) updates.task_status = params.status;
    if (params.workflowState) updates.workflow_state = params.workflowState;

    const { error: updateError } = await this.admin
      .from("tasks")
      .update(updates)
      .eq("id", taskId);

    if (updateError) throw updateError;

    await this.logTaskHistory(this.admin, {
      taskId,
      actionType: "state_changed",
      performedBy,
      oldState: task.task_status,
      newState: params.status || task.task_status,
      notes: params.notes,
    });
  }

  /**
   * Specialized method for assignment-driven upload tasks.
   * Ensures that if a user is assigned to a credit, an active upload task exists for them.
   */
  async upsertAssignmentUploadTask(params: {
    projectId: string;
    projectCreditId: string;
    assignedUserId: string;
    createdBy: string;
    priority?: TaskPriority;
    docType?: string;
  }) {
    const taskType = "assignment_upload";

    // Deactivate old tasks for this credit/docType if assignee changed
    await this.admin
      .from("tasks")
      .update({ active_flag: false, updated_at: new Date().toISOString() })
      .eq("project_credit_id", params.projectCreditId)
      .eq("task_type", taskType)
      .eq("active_flag", true)
      .neq("assigned_to", params.assignedUserId);

    // Check if an active task already exists for this assignee
    const { data: existing } = await this.admin
      .from("tasks")
      .select("id")
      .eq("project_credit_id", params.projectCreditId)
      .eq("assigned_to", params.assignedUserId)
      .eq("task_type", taskType)
      .eq("active_flag", true)
      .maybeSingle();

    if (existing) {
      // Update priority if changed
      if (params.priority) {
        await this.admin
          .from("tasks")
          .update({ priority: params.priority, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      }
      return existing;
    }

    // Create new task
    return this.createTask({
      projectId: params.projectId,
      creditId: params.projectCreditId,
      taskType,
      assignedBy: params.createdBy,
      assignedTo: params.assignedUserId,
      priority: params.priority || "HIGH",
      docType: params.docType,
    });
  }

  /**
   * Creates or refreshes a clarification follow-up task for a document owner.
   * If schema support for per-document task linkage is unavailable, this
   * gracefully falls back to creating a scoped clarification task.
   */
  async upsertClarificationTask(params: ClarificationTaskParams) {
    const taskType = "clarification_followup";
    const actorId = params.createdBy ?? params.assignedUserId;

    // Best-effort: close any active clarification tasks for this user/project.
    await this.admin
      .from("tasks")
      .update({ active_flag: false, updated_at: new Date().toISOString() })
      .eq("project_id", params.projectId)
      .eq("assigned_to", params.assignedUserId)
      .eq("task_type", taskType)
      .eq("active_flag", true);

    const task = await this.createTask({
      projectId: params.projectId,
      taskType,
      assignedBy: actorId,
      assignedTo: params.assignedUserId,
      priority: "HIGH",
      docType: "clarification",
    });

    await this.logTaskHistory(this.admin, {
      taskId: task.id,
      actionType: "clarification_requested",
      performedBy: actorId,
      notes:
        params.description ??
        params.title ??
        `Clarification requested for document ${params.documentId}.`,
    });

    return task;
  }

  /**
   * Closes/Deactivates tasks when an assignment is cleared.
   */
  async closeAssignmentTasks(params: {
    projectId: string;
    projectCreditId: string;
  }) {
    const { error } = await this.admin
      .from("tasks")
      .update({ 
        active_flag: false, 
        task_status: "REJECTED", // Or just 'CLOSED' if we add it
        updated_at: new Date().toISOString() 
      })
      .eq("project_credit_id", params.projectCreditId)
      .eq("task_type", "assignment_upload")
      .eq("active_flag", true);

    if (error) throw error;
  }

  async getTasksForUser(userId: string) {
    const { data, error } = await this.client
      .from("tasks")
      .select(`
        *,
        project:projects(id, name),
        credit:project_credits(id, credit_code, credit_name)
      `)
      .eq("assigned_to", userId)
      .eq("active_flag", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }
}

export const taskService = new TaskService();

// Standalone exports for backward compatibility
export const createTask = (client: any, params: any) => taskService.createTask(params);
export const delegateTask = (taskId: string, delegatedBy: string, delegatedTo: string) => taskService.delegateTask(taskId, delegatedBy, delegatedTo);
export const updateTaskState = (taskId: string, performedBy: string, params: any) => taskService.updateTaskState(taskId, performedBy, params);
export const getTasksForUser = (userId: string) => taskService.getTasksForUser(userId);
export const logTaskHistory = (client: any, params: any) => taskService.logTaskHistory(client, params);
