"use strict";
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
exports.logTaskHistory = exports.getTasksForUser = exports.updateTaskState = exports.delegateTask = exports.createTask = exports.taskService = exports.TaskService = void 0;
const server_1 = require("@/lib/supabase/server");
const admin_1 = require("@/lib/supabase/admin");
const env_1 = require("@/lib/env");
class TaskService {
    get client() { return (0, server_1.createClient)(); }
    get admin() { return env_1.env.supabaseServiceRoleKey ? (0, admin_1.createAdminClient)() : this.client; }
    /**
     * Logs an action in the task audit trail.
     */
    logTaskHistory(client, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { error } = yield client.from("task_history").insert({
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
        });
    }
    /**
     * Creates a new task and its initial history record.
     */
    createTask(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: task, error } = yield this.admin
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
            if (error)
                throw error;
            yield this.logTaskHistory(this.admin, {
                taskId: task.id,
                actionType: "created",
                performedBy: params.assignedBy,
                newAssignee: params.assignedTo,
                newState: "ASSIGNED",
            });
            return task;
        });
    }
    /**
     * Delegates a task to another user, maintaining accountability.
     */
    delegateTask(taskId, delegatedBy, delegatedTo) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: task, error: fetchError } = yield this.admin
                .from("tasks")
                .select("assigned_to, task_status")
                .eq("id", taskId)
                .single();
            if (fetchError)
                throw fetchError;
            const { error: updateError } = yield this.admin
                .from("tasks")
                .update({
                assigned_to: delegatedTo,
                delegated_by: delegatedBy,
                delegated_from: task.assigned_to,
                task_status: "DELEGATED",
                updated_at: new Date().toISOString(),
            })
                .eq("id", taskId);
            if (updateError)
                throw updateError;
            yield this.logTaskHistory(this.admin, {
                taskId,
                actionType: "delegated",
                performedBy: delegatedBy,
                oldAssignee: task.assigned_to,
                newAssignee: delegatedTo,
                oldState: task.task_status,
                newState: "DELEGATED",
            });
        });
    }
    /**
     * Updates the state/status of a task.
     */
    updateTaskState(taskId, performedBy, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: task, error: fetchError } = yield this.admin
                .from("tasks")
                .select("task_status, workflow_state")
                .eq("id", taskId)
                .single();
            if (fetchError)
                throw fetchError;
            const updates = { updated_at: new Date().toISOString() };
            if (params.status)
                updates.task_status = params.status;
            if (params.workflowState)
                updates.workflow_state = params.workflowState;
            const { error: updateError } = yield this.admin
                .from("tasks")
                .update(updates)
                .eq("id", taskId);
            if (updateError)
                throw updateError;
            yield this.logTaskHistory(this.admin, {
                taskId,
                actionType: "state_changed",
                performedBy,
                oldState: task.task_status,
                newState: params.status || task.task_status,
                notes: params.notes,
            });
        });
    }
    /**
     * Specialized method for assignment-driven upload tasks.
     * Ensures that if a user is assigned to a credit, an active upload task exists for them.
     */
    upsertAssignmentUploadTask(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const taskType = "assignment_upload";
            // Deactivate old tasks for this credit/docType if assignee changed
            yield this.admin
                .from("tasks")
                .update({ active_flag: false, updated_at: new Date().toISOString() })
                .eq("project_credit_id", params.projectCreditId)
                .eq("task_type", taskType)
                .eq("active_flag", true)
                .neq("assigned_to", params.assignedUserId);
            // Check if an active task already exists for this assignee
            const { data: existing } = yield this.admin
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
                    yield this.admin
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
        });
    }
    /**
     * Creates or refreshes a clarification follow-up task for a document owner.
     * If schema support for per-document task linkage is unavailable, this
     * gracefully falls back to creating a scoped clarification task.
     */
    upsertClarificationTask(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const taskType = "clarification_followup";
            const actorId = (_a = params.createdBy) !== null && _a !== void 0 ? _a : params.assignedUserId;
            // Best-effort: close any active clarification tasks for this user/project.
            yield this.admin
                .from("tasks")
                .update({ active_flag: false, updated_at: new Date().toISOString() })
                .eq("project_id", params.projectId)
                .eq("assigned_to", params.assignedUserId)
                .eq("task_type", taskType)
                .eq("active_flag", true);
            const task = yield this.createTask({
                projectId: params.projectId,
                taskType,
                assignedBy: actorId,
                assignedTo: params.assignedUserId,
                priority: "HIGH",
                docType: "clarification",
            });
            yield this.logTaskHistory(this.admin, {
                taskId: task.id,
                actionType: "clarification_requested",
                performedBy: actorId,
                notes: (_c = (_b = params.description) !== null && _b !== void 0 ? _b : params.title) !== null && _c !== void 0 ? _c : `Clarification requested for document ${params.documentId}.`,
            });
            return task;
        });
    }
    /**
     * Closes/Deactivates tasks when an assignment is cleared.
     */
    closeAssignmentTasks(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { error } = yield this.admin
                .from("tasks")
                .update({
                active_flag: false,
                task_status: "REJECTED", // Or just 'CLOSED' if we add it
                updated_at: new Date().toISOString()
            })
                .eq("project_credit_id", params.projectCreditId)
                .eq("task_type", "assignment_upload")
                .eq("active_flag", true);
            if (error)
                throw error;
        });
    }
    getTasksForUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data, error } = yield this.client
                .from("tasks")
                .select(`
        *,
        project:projects(id, name),
        credit:project_credits(id, credit_code, credit_name)
      `)
                .eq("assigned_to", userId)
                .eq("active_flag", true)
                .order("created_at", { ascending: false });
            if (error)
                throw error;
            return data;
        });
    }
}
exports.TaskService = TaskService;
exports.taskService = new TaskService();
// Standalone exports for backward compatibility
const createTask = (client, params) => exports.taskService.createTask(params);
exports.createTask = createTask;
const delegateTask = (taskId, delegatedBy, delegatedTo) => exports.taskService.delegateTask(taskId, delegatedBy, delegatedTo);
exports.delegateTask = delegateTask;
const updateTaskState = (taskId, performedBy, params) => exports.taskService.updateTaskState(taskId, performedBy, params);
exports.updateTaskState = updateTaskState;
const getTasksForUser = (userId) => exports.taskService.getTasksForUser(userId);
exports.getTasksForUser = getTasksForUser;
const logTaskHistory = (client, params) => exports.taskService.logTaskHistory(client, params);
exports.logTaskHistory = logTaskHistory;
