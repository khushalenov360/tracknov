import Link from "next/link";
import { createProjectAction, updateOnboardingChecklistAction } from "@/app/actions";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { getAuditTimeline, getCurrentUser, getDashboardProjects, getExecutiveInsights, getOrCreateOnboardingChecklist, getOwnerReviewQueue } from "@/lib/data";
import { igbcRatingSystemGroups, roleLabels } from "@/lib/constants";
import { formatDateTimeIST, pct } from "@/lib/utils";

import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { project?: string; action?: string; entity?: string; actor_role?: string };
}) {
  cookies();
  const [user, projects, ownerQueue, insights] = await Promise.all([
    getCurrentUser(),
    getDashboardProjects(),
    getOwnerReviewQueue(),
    getExecutiveInsights(),
  ]);
  const [timelineRows] = await Promise.all([
    getAuditTimeline({
      projectId: searchParams?.project,
      action: searchParams?.action,
      entityType: searchParams?.entity,
      actorRole: searchParams?.actor_role,
      limit: 80,
    }),
  ]);
  const canCreateProject = ["super_user", "super_admin"].includes(user?.role ?? "");
  const activeRole = user?.role ?? "consultant";
  const clientMode = activeRole === "client";
  const primaryProjectId = projects[0]?.id ?? null;
  const onboarding = primaryProjectId ? await getOrCreateOnboardingChecklist(primaryProjectId) : null;
  const checklist = onboarding?.checklist ?? null;
  const checklistDone = checklist ? Object.values(checklist).filter(Boolean).length : 0;
  const isOwner = activeRole === "owner";

  const totals = {
    totalCredits: projects.reduce((sum, project) => sum + project.totalCredits, 0),
    uploadedDocs: projects.reduce((sum, project) => sum + project.uploadedDocs, 0),
    mandatoryCreditsMet: projects.reduce((sum, project) => sum + project.mandatoryCreditsMet, 0),
    openRemarks: projects.reduce((sum, project) => sum + project.openRemarks, 0),
  };

  const totalTokensLoaded = projects.reduce((sum, project) => {
    const used = Math.max(project.documentCreditsUsed ?? 0, 0);
    const remaining = Math.max(project.documentCreditsRemaining ?? 0, 0);
    return sum + used + remaining;
  }, 0);
  const totalTokensUsed = projects.reduce((sum, project) => sum + Math.max(project.documentCreditsUsed ?? 0, 0), 0);
  const totalTokensRemaining = projects.reduce((sum, project) => sum + Math.max(project.documentCreditsRemaining ?? 0, 0), 0);
  const weeklyTokenBurn = Math.max(
    1,
    Math.round(
      projects.reduce((sum, project) => {
        const docs = Math.max(project.documentCreditsUsed ?? 0, 0);
        const consult = Math.max(project.consultantCreditsUsed ?? 0, 0);
        return sum + docs + consult;
      }, 0) / 4,
    ),
  );
  const exhaustionWeeks = totalTokensRemaining > 0 ? Math.ceil(totalTokensRemaining / weeklyTokenBurn) : 0;
  const portfolioCompleted = projects.filter((project) => project.overallCompletion >= 95).length;
  const portfolioDelayed = projects.filter((project) => (project.statusFlag ?? "green") === "red").length;
  const portfolioInProgress = Math.max(projects.length - portfolioCompleted, 0);
  const atRiskCount = projects.filter((project) => (project.statusFlag ?? "green") !== "green").length;
  const overallCompletionPct = projects.length
    ? Math.round(projects.reduce((sum, project) => sum + project.overallCompletion, 0) / projects.length)
    : 0;
  const projectedRating = overallCompletionPct >= 80 ? "Gold" : overallCompletionPct >= 60 ? "Silver" : "Certified";
  const projectedOutcome =
    overallCompletionPct >= 80
      ? "High confidence: target likely on current pace."
      : overallCompletionPct >= 60
        ? "Moderate confidence: needs steady weekly closure."
        : "At risk: improve upload and review velocity.";
  const approvalBase = projects.reduce(
    (sum, project) => sum + Math.max((project.pendingReviewsCount ?? 0) + (project.rejectedCount ?? 0), 0),
    0,
  );
  const rejectionTotal = projects.reduce((sum, project) => sum + Math.max(project.rejectedCount ?? 0, 0), 0);
  const rejectionRate = approvalBase > 0 ? Math.round((rejectionTotal / approvalBase) * 100) : 0;
  const firstTimeApprovalRate = Math.max(100 - rejectionRate, 0);
  const avgTokensPerProject = projects.length ? Math.round(totalTokensUsed / projects.length) : 0;
  const efficiencyScore = Math.max(
    0,
    Math.min(100, Math.round((firstTimeApprovalRate * 0.7) + (Math.max(0, 100 - rejectionRate) * 0.3))),
  );

  const executiveRiskRows = projects.map((project) => {
    const pending = Math.max(project.pendingReviewsCount ?? 0, 0);
    const rejected = Math.max(project.rejectedCount ?? 0, 0);
    const risk =
      (project.statusFlag ?? "green") === "red"
        ? "Critical"
        : (project.statusFlag ?? "green") === "amber"
          ? "Delay Risk"
          : "On Track";
    return {
      id: project.id,
      name: project.name,
      completion: pct(project.overallCompletion),
      pending,
      rejected,
      risk,
    };
  });

  const ownerRows = projects.map((project) => {
    const queueForProject = ownerQueue.filter((item) => item.project_id === project.id);
    const pendingUploads = Math.max(project.totalCredits - project.uploadedDocs, 0);
    const pendingMyReview = queueForProject.length;
    const pendingApprovals = Number(project.pendingReviewsCount ?? 0);
    const rejectedCount = Number(project.rejectedCount ?? 0);
    const atConsultant = Math.max(project.openRemarks, 0);
    const riskScore = pendingUploads + pendingMyReview + atConsultant;
    const risk =
      project.statusFlag === "red" || riskScore >= 8 ? "Risk" : project.statusFlag === "amber" || riskScore >= 3 ? "Delayed" : "On Track";
    return {
      project,
      pendingUploads,
      pendingMyReview,
      pendingApprovals,
      rejectedCount,
      atConsultant,
      risk,
    };
  });
  const nextBestActions = (() => {
    const stuckTop = insights.stuckItems[0];
    if (activeRole === "owner") {
      return [
        `Clear your review queue (${ownerQueue.length} pending) to keep vendor submissions moving.`,
        stuckTop
          ? `Escalate ${stuckTop.projectName} / ${stuckTop.creditCode}: ${stuckTop.missingDoc}.`
          : "No major blocker detected. Continue daily owner-review sweeps.",
        "Use precise send-back remarks so L0 users can resubmit without calls.",
      ];
    }
    if (activeRole === "project_admin" || activeRole === "super_admin") {
      const highRisk = projects.filter((project) => (project.statusFlag ?? "green") !== "green").length;
      return [
        `Prioritize ${highRisk} at-risk project(s) first in validation queue.`,
        stuckTop
          ? `Resolve top blocker: ${stuckTop.projectName} / ${stuckTop.creditCode} (${stuckTop.responsibleRole}).`
          : "No blocker cluster detected. Push owner-approved documents to final decision.",
        "Close repeated rejection reasons with template-based corrective guidance.",
      ];
    }
    if (activeRole === "client") {
      return [
        `Review ${atRiskCount} at-risk location(s) and escalate delayed vendors.`,
        `Token runway is ${exhaustionWeeks} week(s); plan top-up before freeze.`,
        "Use project comparison board to prioritize leadership reviews this week.",
      ];
    }
    return [
      "Complete mapped uploads for your assigned credits first.",
      stuckTop
        ? `Focus on ${stuckTop.creditCode}: ${stuckTop.missingDoc}.`
        : "No blocking alert found. Continue checklist closure.",
      "Resubmit rejected files with explicit correction notes to speed approval.",
    ];
  })();

  const totalDocTokensRemaining = projects.reduce((sum, project) => sum + Math.max(project.documentCreditsRemaining ?? 0, 0), 0);
  const totalDocTokensUsed = projects.reduce((sum, project) => sum + Math.max(project.documentCreditsUsed ?? 0, 0), 0);
  const weeklyUsage = projects.reduce((sum, project) => sum + Math.max(project.consultantCreditsUsed ?? 0, 0), 0);

  return (
    <Shell
      title={clientMode ? "Client Dashboard" : `${roleLabels[activeRole]} Dashboard`}
      description={
        clientMode
          ? "Simple project progress, pending actions, and submission readiness."
          : "Overview of active projects, documentation progress, and review status."
      }
      role={activeRole}
      notificationCount={projects.reduce((sum, project) => sum + project.openRemarks, 0)}
    >
      {primaryProjectId && checklist ? (
        <section className="surface-card mb-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[13px] font-medium text-[var(--color-text-primary)]">Onboarding checklist</h2>
              <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                {checklistDone}/4 completed for your active project.
              </p>
            </div>
            <Badge className="border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
              {checklistDone === 4 ? "Completed" : "In progress"}
            </Badge>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {[
              ["profile_completed", "Confirm profile details"],
              ["project_scope_confirmed", "Confirm project scope"],
              ["first_document_uploaded", "Upload first mapped document"],
              ["first_review_completed", "Complete first review handoff"],
            ].map(([key, label]) => {
              const checked = Boolean((checklist as any)[key]);
              return (
                <form
                  key={key}
                  action={updateOnboardingChecklistAction}
                  className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
                >
                  <input type="hidden" name="project_id" value={primaryProjectId} />
                  <input type="hidden" name="key" value={key} />
                  <input type="hidden" name="value" value={checked ? "false" : "true"} />
                  <span className="text-[12px] text-[var(--color-text-primary)]">{label}</span>
                  <Button type="submit" variant={checked ? "secondary" : "default"} className="h-[28px] rounded-md px-2.5 text-[11px]">
                    {checked ? "Done" : "Mark done"}
                  </Button>
                </form>
              );
            })}
          </div>
        </section>
      ) : null}

      {isOwner ? (
        <section className="surface-card mb-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[13px] font-medium text-[var(--color-text-primary)]">Project Owner command view</h2>
              <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                One-screen portfolio with pending uploads, pending owner reviews, consultant queue, and risk signal.
              </p>
            </div>
            <Button asChild className="h-[32px] rounded-md px-3 text-[12px]">
              <Link href="/review-queue">Open My Review Queue</Link>
            </Button>
          </div>
          <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="min-w-full border-collapse text-[12px]">
              <thead className="bg-[var(--color-surface-2)]">
                <tr className="border-b border-[var(--color-border)]">
                  {["Project", "Progress", "Pending Uploads", "Pending Approvals", "Rejected", "Pending My Review", "At Consultant", "Status"].map((heading) => (
                    <th key={heading} className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ownerRows.map(({ project, pendingUploads, pendingApprovals, rejectedCount, pendingMyReview, atConsultant, risk }) => (
                  <tr key={project.id} className="border-b border-[var(--color-border)]">
                    <td className="px-3 py-2">
                      <Link href={`/projects/${project.id}`} className="text-[var(--color-green)] hover:text-[var(--color-green-dim)]">
                        {project.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{pct(project.overallCompletion)}</td>
                    <td className="px-3 py-2">{pendingUploads}</td>
                    <td className="px-3 py-2">{pendingApprovals}</td>
                    <td className="px-3 py-2">{rejectedCount}</td>
                    <td className="px-3 py-2">{pendingMyReview}</td>
                    <td className="px-3 py-2">{atConsultant}</td>
                    <td className="px-3 py-2">
                      <Badge
                        className={
                          risk === "Risk"
                            ? "border border-[var(--color-red-light)] bg-[var(--color-red-light)] text-[var(--color-red)]"
                            : risk === "Delayed"
                              ? "border border-[var(--color-amber)] bg-[var(--color-amber-soft)] text-[var(--color-amber)]"
                              : "border border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[var(--color-green)]"
                        }
                      >
                        {risk}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Tokens remaining</p>
              <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{totalDocTokensRemaining}</p>
            </div>
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Tokens used</p>
              <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{totalDocTokensUsed}</p>
            </div>
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Consult credits used</p>
              <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{weeklyUsage}</p>
            </div>
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Action queue</p>
              <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{ownerQueue.length}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="surface-card mb-4 p-4">
        <h2 className="text-[13px] font-medium text-[var(--color-text-primary)]">Next best actions</h2>
        <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
          Role-guided actions based on live backlog, blockers, and project risk.
        </p>
        <div className="mt-3 grid gap-2">
          {nextBestActions.map((action) => (
            <div key={action} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-[12px] text-[var(--color-text-primary)]">
              {action}
            </div>
          ))}
        </div>
      </section>

      {clientMode ? (
        <section className="surface-card mb-4 p-4">
          <h2 className="text-[13px] font-medium text-[var(--color-text-primary)]">Executive Control View</h2>
          <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
            30-second status for certification progress, portfolio risk, and token usage.
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "Overall status", value: atRiskCount > 0 ? "Attention needed" : "On Track", meta: `${atRiskCount} at risk` },
              { label: "Projected rating", value: projectedRating, meta: `${overallCompletionPct}% complete` },
              { label: "Projected outcome", value: atRiskCount > 2 ? "Delay risk" : "Trackable", meta: projectedOutcome },
              { label: "Active projects", value: String(projects.length), meta: `${portfolioDelayed} delayed` },
              { label: "Token balance", value: String(totalTokensRemaining), meta: `${weeklyTokenBurn}/week burn` },
              { label: "Runway", value: `${exhaustionWeeks} weeks`, meta: "Estimated exhaustion date" },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                <p className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">{item.label}</p>
                <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{item.value}</p>
                <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{item.meta}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
              <p className="text-[11px] font-medium text-[var(--color-text-primary)]">Portfolio status</p>
              <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                Completed: {portfolioCompleted} / In progress: {portfolioInProgress} / Delayed: {portfolioDelayed}
              </p>
              <div className="mt-3 overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
                <table className="min-w-full border-collapse text-[12px]">
                  <thead className="bg-[var(--color-surface-2)]">
                    <tr className="border-b border-[var(--color-border)]">
                      {["Project", "Completion", "Pending", "Rejected", "Risk"].map((heading) => (
                        <th key={heading} className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {executiveRiskRows.map((item) => (
                      <tr key={item.id} className="border-b border-[var(--color-border)]">
                        <td className="px-3 py-2">{item.name}</td>
                        <td className="px-3 py-2">{item.completion}</td>
                        <td className="px-3 py-2">{item.pending}</td>
                        <td className="px-3 py-2">{item.rejected}</td>
                        <td className="px-3 py-2">
                          <Badge
                            className={
                              item.risk === "Critical"
                                ? "border border-[var(--color-red-light)] bg-[var(--color-red-light)] text-[var(--color-red)]"
                                : item.risk === "Delay Risk"
                                  ? "border border-[var(--color-amber)] bg-[var(--color-amber-soft)] text-[var(--color-amber)]"
                                  : "border border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[var(--color-green)]"
                            }
                          >
                            {item.risk}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
              <p className="text-[11px] font-medium text-[var(--color-text-primary)]">Efficiency and spend</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Efficiency score</p>
                  <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{efficiencyScore}%</p>
                </div>
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">First-time approval</p>
                  <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{firstTimeApprovalRate}%</p>
                </div>
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Rejection rate</p>
                  <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{rejectionRate}%</p>
                </div>
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Avg tokens/project</p>
                  <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{avgTokensPerProject}</p>
                </div>
              </div>
              <div className="mt-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  Tokens loaded: <span className="mono text-[var(--color-text-primary)]">{totalTokensLoaded}</span> / Used:{" "}
                  <span className="mono text-[var(--color-text-primary)]">{totalTokensUsed}</span> / Remaining:{" "}
                  <span className="mono text-[var(--color-text-primary)]">{totalTokensRemaining}</span>
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {projects.slice(0, 3).map((project) => (
                  <Button key={project.id} asChild variant="secondary" className="h-[30px] rounded-md px-3 text-[11px]">
                    <Link href={`/api/projects/${project.id}/summary`}>Export {project.name} PDF</Link>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
              <p className="text-[11px] font-medium text-[var(--color-text-primary)]">What is stuck right now</p>
              <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                Delayed credits with responsible role and exact missing evidence.
              </p>
              <div className="mt-2 overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
                <table className="min-w-full border-collapse text-[12px]">
                  <thead className="bg-[var(--color-surface-2)]">
                    <tr className="border-b border-[var(--color-border)]">
                      {["Project", "Credit", "Responsible", "Missing", "Rejected"].map((heading) => (
                        <th key={heading} className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {insights.stuckItems.slice(0, 8).map((item) => (
                      <tr key={`${item.projectId}-${item.creditId}`} className="border-b border-[var(--color-border)]">
                        <td className="px-3 py-2">{item.projectName}</td>
                        <td className="px-3 py-2">{item.creditCode}</td>
                        <td className="px-3 py-2">{item.responsibleRole}</td>
                        <td className="px-3 py-2">{item.missingDoc}</td>
                        <td className="px-3 py-2 mono">{item.rejectedCount}</td>
                      </tr>
                    ))}
                    {insights.stuckItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-[11px] text-[var(--color-text-tertiary)]">
                          No major blockers detected.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
              <p className="text-[11px] font-medium text-[var(--color-text-primary)]">Rejection intelligence</p>
              <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                Most frequent rejection reasons across portfolio.
              </p>
              <div className="mt-2 space-y-2">
                {insights.rejectionPatterns.length ? (
                  insights.rejectionPatterns.map((item) => (
                    <div key={item.key} className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                      <span className="text-[11px] text-[var(--color-text-primary)]">{item.key}</span>
                      <Badge className="border border-[var(--color-amber)] bg-[var(--color-amber-soft)] text-[var(--color-amber)]">
                        {item.count}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-[11px] text-[var(--color-text-tertiary)]">
                    No rejection patterns yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
              <p className="text-[11px] font-medium text-[var(--color-text-primary)]">Project comparison board</p>
              <div className="mt-2 overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
                <table className="min-w-full border-collapse text-[12px]">
                  <thead className="bg-[var(--color-surface-2)]">
                    <tr className="border-b border-[var(--color-border)]">
                      {["Project", "%", "Pending", "Rejected", "Efficiency"].map((heading) => (
                        <th key={heading} className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {insights.projectComparisons.map((item) => (
                      <tr key={item.projectId} className="border-b border-[var(--color-border)]">
                        <td className="px-3 py-2">{item.projectName}</td>
                        <td className="px-3 py-2 mono">{item.completion}%</td>
                        <td className="px-3 py-2 mono">{item.pending}</td>
                        <td className="px-3 py-2 mono">{item.rejected}</td>
                        <td className="px-3 py-2 mono">{item.efficiency}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
              <p className="text-[11px] font-medium text-[var(--color-text-primary)]">Vendor intelligence baseline</p>
              <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                Submission quality trends by contributor.
              </p>
              <div className="mt-2 space-y-2">
                {insights.vendorStats.length ? (
                  insights.vendorStats.map((vendor) => (
                    <div key={vendor.uploader} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-medium text-[var(--color-text-primary)]">{vendor.uploader}</p>
                        <Badge className="border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
                          {vendor.approvalRate}% success
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                        Projects: {vendor.projectCount} / Approved: {vendor.approved} / Rejected: {vendor.rejected}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-[11px] text-[var(--color-text-tertiary)]">
                    Vendor performance data will appear after more reviews.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: clientMode ? "Checklist items tracked" : "Tracked credits",
            value: totals.totalCredits,
            meta: `${projects.length} active projects`,
          },
          {
            label: clientMode ? "Files uploaded" : "Docs uploaded",
            value: totals.uploadedDocs,
            meta: clientMode ? "Across assigned projects" : "Across all workspaces",
          },
          {
            label: clientMode ? "Must-have items ready" : "Mandatory met",
            value: totals.mandatoryCreditsMet,
            meta: clientMode ? "Ready for final pack review" : "Ready for submission checks",
          },
          {
            label: clientMode ? "Pending comments" : "Open remarks",
            value: totals.openRemarks,
            meta: clientMode ? "Needs team action" : "Needs consultant review",
          },
        ].map((item) => (
          <div key={item.label} className="surface-card p-4">
            <p className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">{item.label}</p>
            <p className="mono mt-2 text-[28px] font-medium leading-none text-[var(--color-text-primary)]">{item.value}</p>
            <p className="mt-2 text-[11px] text-[var(--color-text-tertiary)]">{item.meta}</p>
          </div>
        ))}
      </section>

      <section className="surface-card mt-4 p-4">
        <h2 className="text-[13px] font-medium text-[var(--color-text-primary)]">Visual audit timeline (IST)</h2>
        <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
          Who did what and when, across visible projects.
        </p>
        <form className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px_auto]">
          <select
            name="project"
            defaultValue={searchParams?.project ?? ""}
            className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
          >
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <input
            name="action"
            defaultValue={searchParams?.action ?? ""}
            placeholder="Action (optional)"
            className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-border-strong)]"
          />
          <input
            name="entity"
            defaultValue={searchParams?.entity ?? ""}
            placeholder="Entity (optional)"
            className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-border-strong)]"
          />
          <input
            name="actor_role"
            defaultValue={searchParams?.actor_role ?? ""}
            placeholder="Role (optional)"
            className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-border-strong)]"
          />
          <Button type="submit" className="h-[34px] rounded-md px-4">
            Filter
          </Button>
        </form>
        <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="min-w-full border-collapse text-[12px]">
            <thead className="bg-[var(--color-surface-2)]">
              <tr className="border-b border-[var(--color-border)]">
                {["Timestamp", "Project", "Entity", "Action", "Summary", "Actor"].map((heading) => (
                  <th key={heading} className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timelineRows.map((row) => (
                <tr key={row.id} className="border-b border-[var(--color-border)]">
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{formatDateTimeIST(row.created_at)}</td>
                  <td className="px-3 py-2 text-[var(--color-text-primary)]">{row.project_name}</td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.entity_type}</td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.action}</td>
                  <td className="px-3 py-2 text-[var(--color-text-primary)]">{row.summary}</td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">
                    {row.actor_name ?? row.actor_role ?? "System"}
                  </td>
                </tr>
              ))}
              {timelineRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[11px] text-[var(--color-text-tertiary)]">
                    No timeline events match current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-4 surface-card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[13px] font-medium text-[var(--color-text-primary)]">Projects</h2>
            <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
              {clientMode
                ? "Open a project for simple progress and pending actions."
                : "Open any project to view section-wise progress and completion."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {projects.length ? (
              projects.map((project) => (
                <Button key={project.id} asChild variant="secondary" className="rounded-md px-3 text-[12px]">
                  <Link href={`/projects/${project.id}`}>{project.name}</Link>
                </Button>
              ))
            ) : (
              <span className="text-[11px] text-[var(--color-text-tertiary)]">No active projects yet.</span>
            )}
          </div>
        </div>
      </section>

      {canCreateProject ? (
        <section className="surface-card mt-4 p-4">
          <form action={createProjectAction} className="grid gap-3 lg:grid-cols-[minmax(260px,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)_180px_auto]">
            <select
              name="rating_system"
              required
              className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
              defaultValue="IGBC Green Interiors"
            >
              {igbcRatingSystemGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.systems.map((system) => (
                    <option key={system} value={system}>
                      {system}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <Input name="name" placeholder="Project name" required />
            <Input name="client" placeholder="Client" required />
            <Input name="location" placeholder="Location" required />
            <Button type="submit" className="h-[34px] rounded-md px-4">
              Create project
            </Button>
            <input type="hidden" name="project_type" value="commercial" />
            <input type="hidden" name="status" value="active" />
            <input type="hidden" name="green_certification" value="IGBC" />
            <input type="hidden" name="igbc_variant" value="new" />
            <input type="hidden" name="target_rating" value="Certified" />
          </form>
        </section>
      ) : null}

      <section className="mt-4 grid gap-3">
        {projects.length ? (
          projects.map((project) => (
            <article key={project.id} className="surface-card flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-medium text-[var(--color-text-primary)]">{project.client || "Project workspace"}</p>
                  <Badge className="border border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[11px] text-[var(--color-green)]">
                    {project.target_rating}
                  </Badge>
                  <Badge className="border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[11px] text-[var(--color-text-secondary)]">
                    {roleLabels[project.role]}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">
                  {project.certification_type} / {project.location || "Location TBD"}
                </p>
                <p className="mt-3 text-[12px] text-[var(--color-text-secondary)]">
                  {clientMode
                    ? `${project.totalCredits} checklist items · ${project.uploadedDocs} files · ${project.mandatoryCreditsMet} must-have ready · ${project.openRemarks} pending comments · ${project.membersCount} team members`
                    : `${project.totalCredits} credits · ${project.uploadedDocs} docs · ${project.mandatoryCreditsMet} mandatory met · ${project.openRemarks} remarks · ${project.membersCount} members`}
                </p>
                <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
                  <Progress value={project.overallCompletion} />
                  <span className="mono text-[12px] text-[var(--color-text-secondary)]">{pct(project.overallCompletion)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 lg:justify-end">
                <Button asChild className="rounded-md px-3 text-[12px]">
                  <Link href={`/projects/${project.id}`}>Open workspace</Link>
                </Button>
                <Button asChild variant="secondary" className="rounded-md px-3 text-[12px]">
                  <Link href={`/projects/${project.id}/submission`}>Submission pack</Link>
                </Button>
              </div>
            </article>
          ))
        ) : (
          <article className="surface-card p-6">
            <h3 className="text-[14px] font-medium text-[var(--color-text-primary)]">No projects available</h3>
            <p className="mt-2 text-[12px] text-[var(--color-text-secondary)]">
              {canCreateProject
                ? "Create your first project from the form above to start documentation workflows."
                : "Ask a Super User or Project Admin to add you to a project workspace."}
            </p>
          </article>
        )}
      </section>
    </Shell>
  );
}
