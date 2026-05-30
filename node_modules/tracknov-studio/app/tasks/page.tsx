import Link from "next/link";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser, getMyRoleTasks } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TasksPage() {
  const [user, board] = await Promise.all([getCurrentUser(), getMyRoleTasks()]);
  const role = user?.role ?? "consultant";

  return (
    <Shell
      title="My Tasks"
      description="Role-scoped checklist for pending credits and evidence completion."
      role={role}
      notificationCount={0}
    >
      <div className="space-y-4 pb-8">
      <section className="surface-card p-4">
        <h2 className="text-[13px] font-medium text-[var(--color-text-primary)]">Scope summary</h2>
        <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
          {board.summary.complete} of {board.summary.total} credits complete / {board.summary.pending} pending.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
            <p className="dense-label">Assigned credits</p>
            <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{board.summary.total}</p>
          </div>
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
            <p className="dense-label">Completed</p>
            <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{board.summary.complete}</p>
          </div>
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
            <p className="dense-label">Pending</p>
            <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{board.summary.pending}</p>
          </div>
        </div>
      </section>

      <section className="surface-card mt-4 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-[12px]">
            <thead className="bg-[var(--color-surface-2)]">
              <tr className="border-b border-[var(--color-border)]">
                {["Project", "Credit", "Progress", "Required docs", "Approved docs", "Status"].map((heading) => (
                  <th key={heading} className="px-3 py-2 text-left text-xs uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {board.tasks.map((task) => (
                <tr key={task.id} className="border-b border-[var(--color-border)]">
                  <td className="px-3 py-2">{task.project_name}</td>
                  <td className="px-3 py-2">
                    <Link href={`/projects/${task.project_id}?credit=${task.id}`} className="text-[var(--color-green)] hover:text-[var(--color-green-dim)]">
                      {task.credit_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 mono">{task.completion_pct}%</td>
                  <td className="px-3 py-2 mono">{task.required_count}</td>
                  <td className="px-3 py-2 mono">{task.approved_count}</td>
                  <td className="px-3 py-2">
                    <Badge className="border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
                      {task.status.replace("_", " ")}
                    </Badge>
                  </td>
                </tr>
              ))}
              {board.tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-[12px] text-[var(--color-text-tertiary)]">
                    No role-scoped tasks found for this account.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      </div>
    </Shell>
  );
}

