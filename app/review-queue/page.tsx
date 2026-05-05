import Link from "next/link";
import { bulkReviewDocumentsAction } from "@/app/actions";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { getCurrentUser, getOwnerReviewQueue, getReviewerPerformanceSummary } from "@/lib/data";
import { formatDateTimeIST } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReviewQueuePage() {
  const [user, queue, metrics] = await Promise.all([getCurrentUser(), getOwnerReviewQueue(), getReviewerPerformanceSummary()]);
  const role = user?.role ?? "consultant";
  const allowBulkActions = role !== "project_admin" && role !== "super_admin";

  return (
    <Shell
      title="My Review Queue"
      description={allowBulkActions ? "Owner/Admin queue for document approvals." : "Project Admin queue for document inspection and single-item review handoff."}
      role={role}
      notificationCount={queue.length}
    >
      <section className="surface-card p-4">
        <div className="mb-3 grid gap-2 sm:grid-cols-4">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Reviewed today</p>
            <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{metrics.reviewedToday}</p>
          </div>
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Approved</p>
            <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{metrics.approvedToday}</p>
          </div>
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Rejected</p>
            <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{metrics.rejectedToday}</p>
          </div>
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Approval rate</p>
            <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{metrics.approvalRateToday}%</p>
          </div>
        </div>

        {allowBulkActions && queue.length ? (
          <form action={bulkReviewDocumentsAction} className="mb-3">
            {queue.map((item) => (
              <input key={`all-${item.id}`} type="hidden" name="document_ids" value={item.id} />
            ))}
            <Button type="submit" name="bulk_action" value="approve" className="h-[32px] rounded-md px-3 text-[12px]">
              Approve All Listed
            </Button>
          </form>
        ) : null}

        <form action={bulkReviewDocumentsAction}>
          <div id="action-buttons" className="mb-3 flex flex-wrap items-center gap-2">
            {allowBulkActions ? (
              <>
                <Button type="submit" name="bulk_action" value="approve" className="h-[32px] rounded-md px-3 text-[12px]">
                  Approve Selected
                </Button>
                <Button type="submit" name="bulk_action" value="reject" variant="danger" className="h-[32px] rounded-md px-3 text-[12px]">
                  Send Back Selected
                </Button>
              </>
            ) : null}
            <select
              name="rejection_type"
              defaultValue=""
              disabled={!allowBulkActions}
              className="h-[32px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none"
            >
              <option value="">Reject reason type</option>
              <option value="missing_data">Missing required information</option>
              <option value="incorrect_format">Incorrect format</option>
              <option value="wrong_document">Wrong document type</option>
              <option value="poor_quality">Poor image quality / unreadable</option>
              <option value="outdated_document">Outdated certificate/document</option>
              <option value="wrong_credit_mapping">Wrong credit mapping</option>
            </select>
            <input
              name="rejection_remark"
              placeholder="Required for send back: exact issue and what to fix (min 20 chars)"
              disabled={!allowBulkActions}
              className="h-[32px] min-w-[320px] flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none"
            />
          </div>

          <div className="space-y-3">
            {queue.map((item) => (
              <div key={item.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <input type="checkbox" name="document_ids" value={item.id} disabled={!allowBulkActions} />
                  <span className="text-[12px] font-medium text-[var(--color-text-primary)]">{item.project_name}</span>
                  <span className="text-[11px] text-[var(--color-text-secondary)]">/ {item.credit_name}</span>
                </div>
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] text-[var(--color-text-primary)]">{item.file_name}</p>
                    <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">
                      Uploaded by {item.uploaded_by_name} / {formatDateTimeIST(item.uploaded_at)}
                    </p>
                    {item.notes ? <p className="mt-2 text-[11px] text-[var(--color-text-secondary)]">{item.notes}</p> : null}
                    <p className="mt-2 text-[11px] text-[var(--color-text-secondary)]">
                      <Link href={`/api/documents/${item.id}`} target="_blank" className="text-[var(--color-green)] hover:text-[var(--color-green-dim)]">
                        Open full document
                      </Link>
                    </p>
                  </div>
                  <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                    <iframe src={`/api/documents/${item.id}`} title={`Preview ${item.file_name}`} className="h-[220px] w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="min-w-full border-collapse text-[12px]">
              <thead className="bg-[var(--color-surface-2)]">
                <tr className="border-b border-[var(--color-border)]">
                  {["", "Project", "Credit", "Uploaded by", "File", "Upload time", "Preview"].map((heading) => (
                    <th key={heading} className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => (
                  <tr key={item.id} className="border-b border-[var(--color-border)]">
                    <td className="px-3 py-2">
                      <input type="checkbox" name="document_ids" value={item.id} disabled={!allowBulkActions} />
                    </td>
                    <td className="px-3 py-2">{item.project_name}</td>
                    <td className="px-3 py-2">{item.credit_name}</td>
                    <td className="px-3 py-2">{item.uploaded_by_name}</td>
                    <td className="px-3 py-2">
                      <div className="max-w-[280px] truncate text-[var(--color-text-primary)]">{item.file_name}</div>
                      {item.notes ? <div className="text-[11px] text-[var(--color-text-tertiary)]">{item.notes}</div> : null}
                    </td>
                    <td className="px-3 py-2 text-[var(--color-text-secondary)]">{formatDateTimeIST(item.uploaded_at)}</td>
                    <td className="px-3 py-2">
                      <Link href={`/api/documents/${item.id}`} target="_blank" className="text-[var(--color-green)] hover:text-[var(--color-green-dim)]">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-[12px] text-[var(--color-text-tertiary)]">
                      No documents are pending your review.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </form>
      </section>
    </Shell>
  );
}

