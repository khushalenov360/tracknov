"use client";

import { useState } from "react";
import { Badge } from "@/components/ui-lib/ui/badge";
import { Button } from "@/components/ui-lib/ui/button";
import { TaskRecord, TaskHistoryRecord, TaskState, TaskPriority } from "@/lib/types";
import { formatDateTimeIST, cleanRoleLabel } from "@/lib/utils";
import { 
  ArrowRight, 
  History, 
  User, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { updateTaskStateAction, delegateTaskAction } from "@/app/actions";
import { roleLabels } from "@/lib/constants";

type TaskDetailPanelProps = {
  task: TaskRecord & { 
    history: TaskHistoryRecord[];
    project: { name: string };
    credit?: { credit_code: string; credit_name: string };
  };
  currentUserId: string;
  currentUserRole: string;
  projectMembers: { user_id: string; full_name: string; role: string; email: string }[];
};

const stateColors: Record<TaskState, string> = {
  ASSIGNED: "bg-blue-100 text-blue-800",
  DELEGATED: "bg-purple-100 text-purple-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  UPLOADED: "bg-indigo-100 text-indigo-800",
  UNDER_REVIEW: "bg-cyan-100 text-cyan-800",
  CLARIFICATION: "bg-orange-100 text-orange-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

const priorityColors: Record<TaskPriority, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-600",
  HIGH: "bg-orange-100 text-orange-600",
  CRITICAL: "bg-red-100 text-red-600",
};

export function TaskDetailPanel({ task, currentUserId, currentUserRole, projectMembers }: TaskDetailPanelProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [isDelegating, setIsDelegating] = useState(false);

  const canDelegate = (currentUserRole === "project_admin" || currentUserRole === "owner") && 
                     task.accountable_user_id === currentUserId &&
                     task.workflow_state !== "APPROVED";

  const isAssignedToMe = task.assigned_to === currentUserId;

  const getUserName = (userId: string) => {
    const name = projectMembers.find(m => m.user_id === userId)?.full_name || "Unknown User";
    return cleanRoleLabel(name);
  };

  const getRoleLabel = (userId: string) => {
    const role = projectMembers.find(m => m.user_id === userId)?.role;
    if (!role) return "Unknown Role";
    return roleLabels[role as keyof typeof roleLabels] || cleanRoleLabel(role);
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
            {task.credit ? `${task.credit.credit_code}: ${task.credit.credit_name}` : "General Task"}
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            {task.doc_type ? `${task.doc_type} Preparation` : task.task_type.replace(/_/g, " ")}
          </p>
        </div>
        <Badge className={stateColors[task.workflow_state]}>
          {task.workflow_state}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-[var(--color-surface-2)] p-2">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Assigned To</p>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs text-white font-bold">
              {getUserName(task.assigned_to).charAt(0)}
            </div>
            <div>
              <p className="text-[12px] font-medium text-[var(--color-text-primary)]">{getUserName(task.assigned_to)}</p>
              <p className="text-xs text-[var(--color-text-tertiary)] uppercase">{getRoleLabel(task.assigned_to)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-[var(--color-surface-2)] p-2">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">Accountable Coordinator</p>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-xs text-white font-bold">
              {getUserName(task.accountable_user_id).charAt(0)}
            </div>
            <div>
              <p className="text-[12px] font-medium text-[var(--color-text-primary)]">{getUserName(task.accountable_user_id)}</p>
              <p className="text-xs text-[var(--color-text-tertiary)] uppercase">{getRoleLabel(task.accountable_user_id)}</p>
            </div>
          </div>
        </div>
      </div>

      {task.delegated_by && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] p-2 text-xs text-[var(--color-text-secondary)]">
          <Clock className="h-3.5 w-3.5" />
          <span>
            Delegated by <strong>{getUserName(task.delegated_by)}</strong> from <strong>{getUserName(task.delegated_from!)}</strong>
          </span>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Priority: </span>
          <Badge className={`text-[9px] ${priorityColors[task.priority]}`}>{task.priority}</Badge>
        </div>
        {task.due_date && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--color-border)]">
        {isAssignedToMe && task.workflow_state === "ASSIGNED" && (
          <form action={updateTaskStateAction}>
            <input type="hidden" name="task_id" value={task.id} />
            <input type="hidden" name="project_id" value={task.project_id} />
            <input type="hidden" name="state" value="IN_PROGRESS" />
            <Button variant="secondary" className="h-8 text-xs">Start Work</Button>
          </form>
        )}

        {isAssignedToMe && ["IN_PROGRESS", "CLARIFICATION"].includes(task.workflow_state) && (
          <form action={updateTaskStateAction}>
            <input type="hidden" name="task_id" value={task.id} />
            <input type="hidden" name="project_id" value={task.project_id} />
            <input type="hidden" name="state" value="UPLOADED" />
            <Button variant="secondary" className="h-8 text-xs">Submit Evidence</Button>
          </form>
        )}

        {/* Reviewer Actions (Accountable PM or Admin) */}
        {(task.accountable_user_id === currentUserId || currentUserRole === "project_admin") && (
          <>
            {task.workflow_state === "UPLOADED" && (
              <form action={updateTaskStateAction}>
                <input type="hidden" name="task_id" value={task.id} />
                <input type="hidden" name="project_id" value={task.project_id} />
                <input type="hidden" name="state" value="UNDER_REVIEW" />
                <Button variant="secondary" className="h-8 text-xs border-blue-200 text-blue-700 bg-blue-50">
                  Mark Under Review
                </Button>
              </form>
            )}

            {task.workflow_state === "UNDER_REVIEW" && (
              <div className="flex gap-2">
                <form action={updateTaskStateAction}>
                  <input type="hidden" name="task_id" value={task.id} />
                  <input type="hidden" name="project_id" value={task.project_id} />
                  <input type="hidden" name="state" value="APPROVED" />
                  <Button className="h-8 text-xs bg-green-600 hover:bg-green-700">Approve</Button>
                </form>
                
                <form action={updateTaskStateAction} className="flex gap-2">
                  <input type="hidden" name="task_id" value={task.id} />
                  <input type="hidden" name="project_id" value={task.project_id} />
                  <input type="hidden" name="state" value="REJECTED" />
                  <input type="text" name="notes" placeholder="Reason..." className="h-8 w-24 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs outline-none" required />
                  <Button variant="danger" className="h-8 text-xs">Reject</Button>
                </form>
              </div>
            )}

            {["UPLOADED", "UNDER_REVIEW"].includes(task.workflow_state) && (
              <form action={updateTaskStateAction} className="flex gap-2">
                <input type="hidden" name="task_id" value={task.id} />
                <input type="hidden" name="project_id" value={task.project_id} />
                <input type="hidden" name="state" value="CLARIFICATION" />
                <input type="text" name="notes" placeholder="What is missing?" className="h-8 w-32 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs outline-none" required />
                <Button variant="secondary" className="h-8 text-xs">Need Clarification</Button>
              </form>
            )}
          </>
        )}

        {canDelegate && !isDelegating && (
          <Button variant="secondary" className="h-8 text-xs" onClick={() => setIsDelegating(true)}>
            Delegate Execution
          </Button>
        )}

        {isDelegating && (
          <div className="w-full space-y-2 rounded-lg bg-[var(--color-surface-2)] p-3">
            <p className="text-xs font-medium text-[var(--color-text-primary)]">Delegate to contributor</p>
            <form action={delegateTaskAction} className="space-y-2">
              <input type="hidden" name="task_id" value={task.id} />
              <input type="hidden" name="project_id" value={task.project_id} />
              <select 
                name="delegated_to"
                required
                className="h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs outline-none"
              >
                <option value="">Select Member</option>
                {projectMembers
                  .filter(m => ["architect", "mep", "contractor", "consultant"].includes(m.role) && m.user_id !== currentUserId)
                  .map(m => (
                    <option key={m.user_id} value={m.user_id}>{cleanRoleLabel(m.full_name)} ({cleanRoleLabel(m.role).toUpperCase()})</option>
                  ))}
              </select>
              <textarea 
                name="notes" 
                placeholder="Brief delegation instructions..."
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-xs outline-none"
                rows={2}
              />
              <div className="flex gap-2">
                <Button type="submit" className="h-7 text-xs">Confirm Delegation</Button>
                <Button type="button" variant="ghost" className="h-7 text-xs" onClick={() => setIsDelegating(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="mt-2">
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
        >
          <History className="h-3.5 w-3.5" />
          <span>View Audit Trail</span>
          {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {showHistory && (
          <div className="mt-3 space-y-3 pl-2 border-l-2 border-[var(--color-border)]">
            {task.history.map((log) => (
              <div key={log.id} className="relative">
                <p className="text-xs font-medium text-[var(--color-text-primary)]">
                  {log.action_type.charAt(0).toUpperCase() + log.action_type.slice(1)}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-text-tertiary)]">
                  <span>{getUserName(log.performed_by)}</span>
                  <span>•</span>
                  <span>{formatDateTimeIST(log.created_at)}</span>
                </div>
                {log.old_state && log.new_state && (
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    <Badge className="px-1 py-0 h-4 text-[8px] opacity-60">{log.old_state}</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge className="px-1 py-0 h-4 text-[8px]">{log.new_state}</Badge>
                  </div>
                )}
                {log.notes && (
                  <p className="mt-1 text-xs italic text-[var(--color-text-secondary)] bg-[var(--color-surface-2)] p-1.5 rounded">
                    &quot;{log.notes}&quot;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
