import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TaskRecord, TaskState, TaskPriority } from "@/lib/types";
import { notifyUsers } from "./workflow-service";

type SupabaseClient = ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>;

export async function logTaskHistory(
  writer: SupabaseClient,
  params: {
    taskId: string;
    actionType: string;
    performedBy: string;
    oldState?: TaskState | null;
    newState?: TaskState | null;
    oldAssignee?: string | null;
    newAssignee?: string | null;
    notes?: string | null;
  },
) {
  const { taskId, actionType, performedBy, oldState, newState, oldAssignee, newAssignee, notes } = params;
  await writer.from("task_history").insert({
    task_id: taskId,
    action_type: actionType,
    performed_by: performedBy,
    old_state: oldState,
    new_state: newState,
    old_assignee: oldAssignee,
    new_assignee: newAssignee,
    notes,
  });
}

export async function createTask(
  writer: SupabaseClient,
  params: {
    projectId: string;
    creditId?: string | null;
    taskType: string;
    assignedBy: string;
    assignedTo: string;
    priority?: TaskPriority;
    dueDate?: string | null;
    docType?: string | null;
  },
) {
  const { projectId, creditId, taskType, assignedBy, assignedTo, priority = "MEDIUM", dueDate, docType } = params;

  // Initial assignment: assigned_to is the accountable person
  const { data: task, error } = await writer
    .from("tasks")
    .insert({
      project_id: projectId,
      project_credit_id: creditId,
      task_type: taskType,
      assigned_by: assignedBy,
      assigned_to: assignedTo,
      accountable_user_id: assignedTo,
      priority,
      due_date: dueDate,
      doc_type: docType,
      workflow_state: "ASSIGNED",
    })
    .select()
    .single();

  if (error) throw error;

  await logTaskHistory(writer, {
    taskId: task.id,
    actionType: "created",
    performedBy: assignedBy,
    newState: "ASSIGNED",
    newAssignee: assignedTo,
  });

  await notifyUsers(writer, {
    projectId,
    creditId,
    userIds: [assignedTo],
    body: `New task assigned: ${taskType}. Please check your dashboard.`,
  });

  return task as TaskRecord;
}

export async function delegateTask(
  writer: SupabaseClient,
  params: {
    taskId: string;
    delegatedBy: string;
    delegatedTo: string;
    notes?: string | null;
  },
) {
  const { taskId, delegatedBy, delegatedTo, notes } = params;

  // Fetch current task to get accountability
  const { data: currentTask, error: fetchError } = await writer
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (fetchError) throw fetchError;

  // Delegation logic:
  // - assigned_to becomes the new person (L0)
  // - delegated_by is the person who delegated (L1)
  // - delegated_from is the previous assigned_to (L1)
  // - accountable_user_id remains unchanged (L1)
  const { data: updatedTask, error: updateError } = await writer
    .from("tasks")
    .update({
      assigned_to: delegatedTo,
      delegated_by: delegatedBy,
      delegated_from: currentTask.assigned_to,
      workflow_state: "DELEGATED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select()
    .single();

  if (updateError) throw updateError;

  await logTaskHistory(writer, {
    taskId: updatedTask.id,
    actionType: "delegated",
    performedBy: delegatedBy,
    oldState: currentTask.workflow_state,
    newState: "DELEGATED",
    oldAssignee: currentTask.assigned_to,
    newAssignee: delegatedTo,
    notes,
  });

  await notifyUsers(writer, {
    projectId: updatedTask.project_id,
    creditId: updatedTask.project_credit_id,
    userIds: [delegatedTo, updatedTask.accountable_user_id],
    body: `Task delegated: ${updatedTask.task_type}. Assigned to ${delegatedTo}.`,
  });

  return updatedTask as TaskRecord;
}

export async function updateTaskState(
  writer: SupabaseClient,
  params: {
    taskId: string;
    newState: TaskState;
    actorId: string;
    notes?: string | null;
  },
) {
  const { taskId, newState, actorId, notes } = params;

  const { data: currentTask, error: fetchError } = await writer
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (fetchError) throw fetchError;

  const { data: updatedTask, error: updateError } = await writer
    .from("tasks")
    .update({
      workflow_state: newState,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select()
    .single();

  if (updateError) throw updateError;

  await logTaskHistory(writer, {
    taskId: updatedTask.id,
    actionType: "state_changed",
    performedBy: actorId,
    oldState: currentTask.workflow_state,
    newState,
    notes,
  });

  // Notify relevant parties
  const notifyList = [currentTask.assigned_to, currentTask.accountable_user_id].filter(id => id !== actorId);
  if (notifyList.length > 0) {
    await notifyUsers(writer, {
      projectId: updatedTask.project_id,
      creditId: updatedTask.project_credit_id,
      userIds: notifyList,
      body: `Task state changed to ${newState}: ${updatedTask.task_type}.`,
    });
  }

  return updatedTask as TaskRecord;
}

export async function getTasksForUser(
  client: SupabaseClient,
  userId: string,
  projectId?: string,
) {
  let query = client
    .from("tasks")
    .select(`
      *,
      project:projects(name),
      credit:credits(credit_code, credit_name)
    `)
    .eq("assigned_to", userId)
    .eq("active_flag", true)
    .order("priority", { ascending: false })
    .order("due_date", { ascending: true });

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getTaskWithHistory(
  client: SupabaseClient,
  taskId: string,
) {
  const { data: task, error: taskError } = await client
    .from("tasks")
    .select(`
      *,
      project:projects(name),
      credit:credits(credit_code, credit_name),
      history:task_history(*)
    `)
    .eq("id", taskId)
    .single();

  if (taskError) throw taskError;
  
  // Sort history locally
  if (task.history) {
    task.history.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  return task;
}
