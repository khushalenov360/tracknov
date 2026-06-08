export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TaskState =
  | "ASSIGNED"
  | "DELEGATED"
  | "IN_PROGRESS"
  | "UPLOADED"
  | "UNDER_REVIEW"
  | "CLARIFICATION"
  | "APPROVED"
  | "REJECTED";

export type TaskResponse = {
  id: string;
  project_id: string;
  project_credit_id?: string | null;
  submittal_id?: string | null;
  task_type: string;
  assigned_by: string;
  assigned_to: string;
  delegated_by?: string | null;
  delegated_from?: string | null;
  accountable_user_id: string;
  workflow_state: TaskState;
  priority: TaskPriority;
  due_date?: string | null;
  doc_type?: string | null;
  created_at: string;
  updated_at: string;
  active_flag: boolean;
};

export type TaskHistoryResponse = {
  id: string;
  task_id: string;
  action_type: string;
  performed_by: string;
  old_state?: TaskState | null;
  new_state?: TaskState | null;
  old_assignee?: string | null;
  new_assignee?: string | null;
  notes?: string | null;
  created_at: string;
};
