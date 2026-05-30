import {
  addRemarkAction,
  createTaskAction,
  setCreditStateAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getProjectWorkspace } from "@/lib/data";
import { canAssignTasks, canReviewProjectDocuments } from "@/lib/rbac";
import { formatDateTimeIST } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectClarificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ credit?: string }>;
}) {
  const { id: projectId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const workspace = await getProjectWorkspace(projectId);

  if (!workspace) return null;

  const isL0Contributor = ["mep", "architect", "contractor"].includes(workspace.userRole);
  const roleScopedCredits = isL0Contributor
    ? workspace.credits.filter((credit: any) => !credit.responsible_role || credit.responsible_role === workspace.userRole)
    : workspace.credits;

  const selectedCredit = roleScopedCredits.find((credit: any) => credit.id === resolvedSearchParams?.credit) ?? roleScopedCredits[0];

  if (!selectedCredit) {
    return (
      <div className="surface-card p-8 text-center text-xs text-[var(--color-text-secondary)]">
        No credits available or selected.
      </div>
    );
  }

  const canReview = canReviewProjectDocuments(workspace.userRole);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 text-left items-start">
      <div className="surface-card p-4 space-y-4">
        <div className="border-b border-[var(--color-border)] pb-2.5">
          <h3 className="text-[13px] font-bold text-[var(--color-text-primary)] uppercase tracking-wide">
            Remarks & Clarification Ledger
          </h3>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            Discussion and official response history for credit {selectedCredit.credit_code}.
          </p>
        </div>

        <div className="space-y-3">
          {selectedCredit.remarks.length > 0 ? (
            selectedCredit.remarks.map((remark: any) => (
              <div key={remark.id} className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center text-xs text-[var(--color-text-tertiary)] font-black uppercase">
                  <span>{remark.role}</span>
                  <span>{formatDateTimeIST(remark.created_at)}</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] font-medium leading-relaxed">
                  {remark.body}
                </p>
              </div>
            ))
          ) : (
            <div className="p-6 border border-dashed border-[var(--color-border)] text-center text-slate-400 rounded-lg">
              <p className="text-xs font-medium">No remarks or clarifications on this credit.</p>
            </div>
          )}
        </div>

        {canReview && (
          <form action={addRemarkAction} className="space-y-2 pt-3 border-t border-[var(--color-border)]">
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="credit_id" value={selectedCredit.id} />
            <input type="hidden" name="role" value={workspace.userRole} />
            <Textarea name="body" placeholder="Post a comment or send-back remark..." required className="min-h-[80px]" />
            <Button type="submit" className="w-full text-xs bg-[var(--color-green)] text-white hover:bg-[var(--color-green-dim)] h-8 rounded-lg">
              Post Remark
            </Button>
          </form>
        )}
      </div>

      <div className="space-y-4">
        {canAssignTasks(workspace.userRole) && (
          <div className="surface-card p-4 space-y-3.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-primary)]">
              Assign Responsibility
            </h3>
            <form action={createTaskAction} className="space-y-3">
              <input type="hidden" name="project_id" value={projectId} />
              <input type="hidden" name="credit_id" value={selectedCredit.id} />
              <input type="hidden" name="task_type" value="credit_documentation" />
              
              <select name="assigned_to" required className="w-full border border-[var(--color-border)] p-2 text-xs bg-[var(--color-surface)] rounded-lg">
                <option value="">Select Assignee</option>
                {workspace.members.map((m: any) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.member_email || m.full_name} ({m.role})
                  </option>
                ))}
              </select>

              <select name="priority" className="w-full border border-[var(--color-border)] p-2 text-xs bg-[var(--color-surface)] rounded-lg">
                <option value="MEDIUM">Medium Priority</option>
                <option value="HIGH">High Priority</option>
                <option value="CRITICAL">Critical</option>
              </select>

              <Button type="submit" className="w-full text-xs h-8 rounded-lg bg-[var(--color-green)] text-white hover:bg-[var(--color-green-dim)]">
                Create Task
              </Button>
            </form>
          </div>
        )}

        {canReview && (
          <div className="surface-card p-4 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-primary)]">
              Gate Approval State
            </h3>
            <form action={setCreditStateAction}>
              <input type="hidden" name="project_id" value={projectId} />
              <input type="hidden" name="credit_id" value={selectedCredit.id} />
              <input type="hidden" name="action" value="complete" />
              <Button type="submit" className="w-full text-xs bg-[var(--color-green)] text-white hover:bg-[var(--color-green-dim)] h-8 rounded-lg">
                Mark Credit Complete
              </Button>
            </form>

            <form action={setCreditStateAction} className="space-y-2 mt-2">
              <input type="hidden" name="project_id" value={projectId} />
              <input type="hidden" name="credit_id" value={selectedCredit.id} />
              <input type="hidden" name="action" value="blocked" />
              <select name="blocked_by" className="w-full border border-[var(--color-border)] p-2 text-xs bg-[var(--color-surface)] rounded-lg">
                <option value="owner">Blocked by Project Manager (PM)</option>
                <option value="consultant">Blocked by consultant</option>
              </select>
              <Button type="submit" variant="danger" className="w-full text-xs h-8 rounded-lg text-white">
                Set Blocked Status
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
