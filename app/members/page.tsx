import { Shell } from "@/components/shell";
import {
  disableTeamMemberAction,
  loadClientTokensAction,
  reactivateTeamMemberAction,
  resetUserPasswordAction,
  runNotificationDigestAction,
} from "@/app/actions";
import { TeamMemberCreateForm } from "@/components/team-member-create-form";
import { Badge } from "@/components/ui-lib/ui/badge";
import { getCurrentUser, getDashboardProjects, getSuperUserCommandCenter, getTeamMembers } from "@/lib/data";
import { roleLabels } from "@/lib/constants";
import { formatDateTimeIST } from "@/lib/utils";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const roleTone: Record<string, string> = {
  super_user: "border border-[#0b1f33] bg-[#0b1f33] text-white",
  l4_reserved: "border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]",
  super_admin: "border border-[var(--color-text-primary)] bg-[var(--color-text-primary)] text-white",
  project_admin: "border border-[var(--color-green)] bg-[var(--color-green)] text-white",
  consultant: "border border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[var(--color-green)]",
  architect: "border border-[var(--color-blue-light)] bg-[var(--color-blue-light)] text-[var(--color-blue)]",
  mep: "border border-[var(--color-purple-light)] bg-[var(--color-purple-light)] text-[var(--color-purple)]",
  contractor: "border border-[var(--color-amber-light)] bg-[var(--color-amber-light)] text-[var(--color-amber)]",
  client: "border border-[var(--color-olive-light)] bg-[var(--color-olive-light)] text-[var(--color-olive)]",
  owner: "border border-[var(--color-olive-light)] bg-[var(--color-olive-light)] text-[var(--color-olive)]",
  L5: "border border-[#0b1f33] bg-[#0b1f33] text-white",
  L4: "border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]",
  L3: "border border-[var(--color-text-primary)] bg-[var(--color-text-primary)] text-white",
  L2: "border border-[var(--color-olive-light)] bg-[var(--color-olive-light)] text-[var(--color-olive)]",
  L1: "border border-[var(--color-olive-light)] bg-[var(--color-olive-light)] text-[var(--color-olive)]",
  L0: "border border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[var(--color-green)]",
};

export default async function TeamPage() {
  cookies();
  const [currentUser, projects, members, commandCenter] = await Promise.all([
    getCurrentUser(),
    getDashboardProjects(),
    getTeamMembers(),
    getSuperUserCommandCenter(),
  ]);
  const activeRole = currentUser?.role ?? projects[0]?.role ?? "consultant";
  const canCreateSystemProfiles = ["super_user", "L5"].includes(activeRole);
  const canCreatePlatformProfiles = ["super_admin"].includes(activeRole);
  const canCreateProjectMembers = ["project_admin", "L3"].includes(activeRole);
  const canCreateOwnerProfiles = ["owner", "L1"].includes(activeRole);
  const allowedRoles = canCreateSystemProfiles
    ? (["project_admin", "client", "owner", "consultant", "architect", "mep", "contractor"] as const)
    : canCreatePlatformProfiles
      ? (["client", "owner", "consultant", "architect", "mep", "contractor"] as const)
      : canCreateProjectMembers
        ? (["client", "owner", "consultant"] as const)
        : canCreateOwnerProfiles
          ? (["architect", "mep", "contractor"] as const)
          : [];
  const teamDescription = canCreateSystemProfiles
    ? "Super User is the apex role with full control over platform users and hierarchy."
    : "User profiles are managed from Super User Control Panel. Other roles have view-only access.";

  return (
    <Shell
      title="Members"
      description={teamDescription}
      role={activeRole}
      notificationCount={projects.reduce((sum, project) => sum + project.openRemarks, 0)}
    >
      <div className="space-y-4 pb-8">
        {canCreateSystemProfiles && allowedRoles.length ? (
          <section className="surface-card p-4">
          <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
            <p className="text-[12px] font-medium text-[var(--color-text-primary)]">Super User Control Panel</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Create and disable user logins. Use login name for identity and keep email as contact.
            </p>
          </div>
          <TeamMemberCreateForm
            allowedRoles={[...allowedRoles]}
          />
        </section>
      ) : null}

      {canCreateSystemProfiles && commandCenter ? (
        <section className="surface-card mt-4 p-4">
          <h2 className="text-[13px] font-medium text-[var(--color-text-primary)]">Super User Command Center</h2>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Multi-client control, token economy, system health, and override actions.
          </p>

          <div id="token-usage" className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <p className="text-xs uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Tokens sold</p>
              <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{commandCenter.tokenEconomy.totalTokensSold}</p>
            </div>
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <p className="text-xs uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Tokens consumed</p>
              <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{commandCenter.tokenEconomy.totalTokensConsumed}</p>
            </div>
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <p className="text-xs uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Weekly burn</p>
              <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{commandCenter.tokenEconomy.weeklyConsumed}</p>
            </div>
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <p className="text-xs uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Revenue estimate (INR)</p>
              <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{commandCenter.tokenEconomy.revenueEstimateInr}</p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
              <p className="text-[12px] font-medium text-[var(--color-text-primary)]">Client portfolio</p>
              <div className="mt-2 overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
                <table className="min-w-full border-collapse text-[12px]">
                  <thead className="bg-[var(--color-surface-2)]">
                    <tr className="border-b border-[var(--color-border)]">
                      {["Client", "Tokens", "Projects", "Status"].map((heading) => (
                        <th key={heading} className="px-3 py-2 text-left text-xs uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {commandCenter.clients.map((row) => (
                      <tr key={row.client_name} className="border-b border-[var(--color-border)]">
                        <td className="px-3 py-2">{row.client_name}</td>
                        <td className="px-3 py-2 mono">{row.wallet_balance}</td>
                        <td className="px-3 py-2 mono">{row.project_count}</td>
                        <td className="px-3 py-2">
                          <Badge
                            className={
                              row.status === "Needs Top-Up"
                                ? "border border-[var(--color-red-light)] bg-[var(--color-red-light)] text-[var(--color-red)]"
                                : "border border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[var(--color-green)]"
                            }
                          >
                            {row.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
              <p className="text-[12px] font-medium text-[var(--color-text-primary)]">System health</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                  <p className="dense-label">Uploads today</p>
                  <p className="mono mt-1">{commandCenter.health.uploadsToday}</p>
                </div>
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                  <p className="dense-label">Failed transactions</p>
                  <p className="mono mt-1">{commandCenter.health.failedTransactions}</p>
                </div>
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                  <p className="dense-label">Pending reviews</p>
                  <p className="mono mt-1">{commandCenter.health.pendingReviews}</p>
                </div>
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                  <p className="dense-label">Active users</p>
                  <p className="mono mt-1">{commandCenter.health.activeUsers}</p>
                </div>
              </div>
              <div className="mt-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
                <p className="text-xs font-medium text-[var(--color-text-primary)]">Critical alerts</p>
                <ul className="mt-1 space-y-1 text-xs text-[var(--color-text-secondary)]">
                  {commandCenter.alerts.length ? (
                    commandCenter.alerts.map((alert) => <li key={alert}>- {alert}</li>)
                  ) : (
                    <li>- No critical alerts right now.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
              <p className="text-[12px] font-medium text-[var(--color-text-primary)]">Token override controls</p>
              <form action={loadClientTokensAction} className="mt-2 grid gap-2">
                <select
                  name="client_user_id"
                  required
                  className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none"
                >
                  <option value="">Select client wallet</option>
                  {commandCenter.wallets.map((wallet) => (
                    <option key={wallet.client_user_id} value={wallet.client_user_id}>
                      {wallet.client_name} ({wallet.client_contact}) / Balance {wallet.balance}
                    </option>
                  ))}
                </select>
                <select
                  name="project_id"
                  required
                  className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none"
                >
                  <option value="">Select project context</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <input
                  name="tokens"
                  type="number"
                  min={1}
                  defaultValue={50}
                  className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none"
                />
                <input
                  name="reason"
                  placeholder="Reason for manual load"
                  defaultValue="Super User manual top-up"
                  className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none"
                />
                <button type="submit" className="h-[32px] rounded-md bg-[var(--color-green)] px-3 text-[12px] font-medium text-white">
                  Add tokens
                </button>
              </form>
            </div>

            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
              <p className="text-[12px] font-medium text-[var(--color-text-primary)]">Recent token transactions</p>
              <div className="mt-2 max-h-[240px] overflow-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
                <table className="min-w-full border-collapse text-xs">
                  <thead className="bg-[var(--color-surface-2)]">
                    <tr className="border-b border-[var(--color-border)]">
                      {["Tokens", "Reason", "Timestamp (IST)"].map((heading) => (
                        <th key={heading} className="px-2 py-1.5 text-left text-xs uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {commandCenter.recentTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-[var(--color-border)]">
                        <td className="px-2 py-1.5 mono">{tx.tokens}</td>
                        <td className="px-2 py-1.5">{tx.reason}</td>
                        <td className="px-2 py-1.5 text-[var(--color-text-secondary)]">{formatDateTimeIST(tx.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <form action={runNotificationDigestAction} className="mt-3">
                <button type="submit" className="h-[32px] rounded-md bg-[var(--color-blue)] px-3 text-[12px] font-medium text-white">
                  Run weekly digest + reminders
                </button>
              </form>
            </div>
          </div>

          <div className="mt-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
            <p className="text-[12px] font-medium text-[var(--color-text-primary)]">Token ledger reconciliation</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Detect debit/refund anomalies by comparing wallet balance and ledger movement.
            </p>
            <div className="mt-2 overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
              <table className="min-w-full border-collapse text-xs">
                <thead className="bg-[var(--color-surface-2)]">
                  <tr className="border-b border-[var(--color-border)]">
                    {["Client", "Wallet", "Ledger Delta", "Baseline", "Status"].map((heading) => (
                      <th key={heading} className="px-2 py-1.5 text-left text-xs uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(commandCenter.reconciliation ?? []).map((row: any) => (
                    <tr key={row.client_user_id} className="border-b border-[var(--color-border)]">
                      <td className="px-2 py-1.5">{row.client_name}</td>
                      <td className="px-2 py-1.5 mono">{row.wallet_balance}</td>
                      <td className="px-2 py-1.5 mono">{row.ledger_delta}</td>
                      <td className="px-2 py-1.5 mono">{row.baseline_estimate}</td>
                      <td className="px-2 py-1.5">
                        <Badge
                          className={
                            row.status === "investigate"
                              ? "border border-[var(--color-red-light)] bg-[var(--color-red-light)] text-[var(--color-red)]"
                              : "border border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[var(--color-green)]"
                          }
                        >
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      <div className="mt-4 text-red-500 font-bold text-lg">
        DEBUG: TOTAL MEMBERS RETURNED: {members.length}
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-[12px]">
            <thead className="bg-[var(--color-surface-2)]">
              <tr className="border-b border-[var(--color-border)]">
                {["Login Name", "Role", "Company", "Projects", "Joined", "Lifecycle"].map((heading) => (
                  <th key={heading} className="px-3 py-2 text-left text-xs uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.length ? members.map((member) => (
                <tr key={member.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)]">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-blue-light)] text-xs font-medium text-[var(--color-blue)]">
                        {member.full_name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-[var(--color-text-primary)]">{member.full_name}</p>
                        <p className="text-xs text-[var(--color-text-tertiary)]">Email contact: {member.email}</p>
                        {member.disabled_at ? (
                          <p className="text-xs text-[var(--color-red)]">
                            Disabled: {formatDateTimeIST(member.disabled_at)} ({member.disabled_reason || "No reason"})
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge className={roleTone[member.role]}>{roleLabels[member.role]}</Badge>
                  </td>
                  <td className="px-3 py-3 text-[var(--color-text-secondary)]">{member.company || "Not set"}</td>
                  <td className="max-w-[320px] px-3 py-3 text-[var(--color-text-secondary)]">
                    {member.project_names.length ? member.project_names.join(", ") : "No project membership"}
                  </td>
                  <td className="px-3 py-3 text-[var(--color-text-secondary)]">
                    {formatDateTimeIST(member.created_at)}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {canCreateSystemProfiles ? (
                      <div className="flex min-w-[220px] flex-col gap-2">
                        {member.disabled_at ? (
                          <form action={reactivateTeamMemberAction}>
                            <input type="hidden" name="user_id" value={member.user_id} />
                            <button type="submit" className="h-[28px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 text-xs">
                              Reactivate
                            </button>
                          </form>
                        ) : (
                          <form action={disableTeamMemberAction} className="flex flex-col gap-1">
                            <input type="hidden" name="user_id" value={member.user_id} />
                            <input
                              name="reason"
                              placeholder="Disable reason"
                              className="h-[28px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs text-[var(--color-text-primary)] outline-none"
                              required
                            />
                            <button type="submit" className="h-[28px] rounded-md border border-[var(--color-red-light)] bg-[var(--color-red-light)] px-2 text-xs text-[var(--color-red)]">
                              Disable
                            </button>
                          </form>
                        )}
                          <form action={resetUserPasswordAction} className="flex flex-col gap-1 border-t border-[var(--color-border)] pt-2">
                            <input type="hidden" name="email" value={member.email} />
                            <button type="submit" className="h-[28px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 text-xs text-[var(--color-text-primary)]">
                              Reset password
                            </button>
                          </form>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--color-text-tertiary)]">View only</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-[12px] text-[var(--color-text-tertiary)]">
                    No team members found for your current workspace scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      </div>
    </Shell>
  );
}
