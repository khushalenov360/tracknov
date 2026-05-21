import Link from "next/link";
import { Shell } from "@/components/shell";
import { WorkflowStatePanel } from "@/components/workflow/workflow-state-panel";
import { getCurrentUser, getOwnerReviewQueue, getReviewerPerformanceSummary } from "@/lib/data";
import { formatDateTimeIST } from "@/lib/utils";
import { workflowStateRenderer } from "@/lib/workflow/state-renderer";

export const dynamic = "force-dynamic";

export default async function ReviewQueuePage() {
  const [user, queue, metrics] = await Promise.all([getCurrentUser(), getOwnerReviewQueue(), getReviewerPerformanceSummary()]);
  const role = user?.role ?? "consultant";

  return (
    <Shell
      title="Project Review Queue"
      description="Project-scoped evidence review with backend-supplied workflow actions and lock state."
      role={role}
      notificationCount={queue.length}
    >
      <section className="surface-card p-4">
        <div className="mb-3 grid gap-2 sm:grid-cols-4">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
            <p className="text-xs uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Reviewed today</p>
            <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{metrics.reviewedToday}</p>
          </div>
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
            <p className="text-xs uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Approved</p>
            <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{metrics.approvedToday}</p>
          </div>
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
            <p className="text-xs uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Rejected</p>
            <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{metrics.rejectedToday}</p>
          </div>
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
            <p className="text-xs uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Approval rate</p>
            <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{metrics.approvalRateToday}%</p>
          </div>
        </div>

        <div className="mb-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-[12px] text-[var(--color-text-secondary)]">
          Bulk approval is disabled by workflow governance. Open a project item and take the next allowed action from the backend action contract.
        </div>

        <div className="space-y-3">
          {queue.map((item) => {
            const workflow = workflowStateRenderer(item.workflow_state);
            return (
              <div key={item.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-medium text-[var(--color-text-primary)]">{item.project_name}</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">/ {item.credit_name}</span>
                </div>
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px_280px]">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] text-[var(--color-text-primary)]">{item.file_name}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                      Uploaded by {item.uploaded_by_name} / {formatDateTimeIST(item.uploaded_at)}
                    </p>
                    {item.notes ? <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{item.notes}</p> : null}
                    <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                      <Link href={`/projects/${item.project_id}/submittals/${item.submittal_id ?? item.id}`} className="mr-3 text-[var(--color-green)] hover:text-[var(--color-green-dim)]">
                        Open review screen
                      </Link>
                      <Link href={`/api/documents/${item.id}`} target="_blank" className="text-[var(--color-green)] hover:text-[var(--color-green-dim)]">
                        Open full document
                      </Link>
                    </p>
                  </div>
                  <WorkflowStatePanel render={workflow} assignedReviewer={role} />
                  <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                    <iframe src={`/api/documents/${item.id}`} title={`Preview ${item.file_name}`} className="h-[220px] w-full" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="min-w-full border-collapse text-[12px]">
              <thead className="bg-[var(--color-surface-2)]">
                <tr className="border-b border-[var(--color-border)]">
                  {["Project", "Credit", "State", "Allowed actions", "Uploaded by", "File", "Upload time", "Preview"].map((heading) => (
                    <th key={heading} className="px-3 py-2 text-left text-xs uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => {
                  const workflow = workflowStateRenderer(item.workflow_state);
                  return (
                    <tr key={item.id} className="border-b border-[var(--color-border)]">
                    <td className="px-3 py-2">{item.project_name}</td>
                    <td className="px-3 py-2">{item.credit_name}</td>
                    <td className="px-3 py-2">{workflow.label}</td>
                    <td className="px-3 py-2 text-[var(--color-text-secondary)]">
                      {workflow.allowedActions.length ? workflow.allowedActions.join(", ") : "None"}
                    </td>
                    <td className="px-3 py-2">{item.uploaded_by_name}</td>
                    <td className="px-3 py-2">
                      <div className="max-w-[280px] truncate text-[var(--color-text-primary)]">{item.file_name}</div>
                      {item.notes ? <div className="text-xs text-[var(--color-text-tertiary)]">{item.notes}</div> : null}
                    </td>
                    <td className="px-3 py-2 text-[var(--color-text-secondary)]">{formatDateTimeIST(item.uploaded_at)}</td>
                    <td className="px-3 py-2">
                      <Link href={`/projects/${item.project_id}/submittals/${item.submittal_id ?? item.id}`} className="mr-3 text-[var(--color-green)] hover:text-[var(--color-green-dim)]">
                        Review
                      </Link>
                      <Link href={`/api/documents/${item.id}`} target="_blank" className="text-[var(--color-green)] hover:text-[var(--color-green-dim)]">
                        Open
                      </Link>
                    </td>
                  </tr>
                  );
                })}
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-[12px] text-[var(--color-text-tertiary)]">
                      No documents are pending your review.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
      </section>
    </Shell>
  );
}

