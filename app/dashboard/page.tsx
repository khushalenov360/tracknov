import Link from 'next/link';

import { createProjectAction } from "@/app/actions";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui-lib/ui/badge";
import { Button } from "@/components/ui-lib/ui/button";
import { Input } from "@/components/ui-lib/ui/input";
import { Progress } from "@/components/ui-lib/ui/progress";
import { getAuditTimeline, getCurrentUser, getDashboardProjects, getExecutiveInsights, getOrCreateOnboardingChecklist, getOwnerReviewQueue, getTasksForUser, getRoleTasks, getRuntimeDesyncSummary, getUserActionQueue, getUserReviewQueue, getUserBlockerQueue } from "@/lib/data";
import { igbcRatingSystemGroups, roleLabels } from "@/lib/constants";
import { toLegacyCreditStatus } from "@/lib/core/workflow-utils";
import { formatDateTimeIST, pct } from "@/lib/utils";
import { TaskDetailPanel } from "@/components/project/TaskDetailPanel";
import { getRoiSnapshot } from "@/lib/harita-engine/services/roi-service";
import { RefreshTrigger } from "@/components/refresh-trigger";
import CommandCenter from "@/components/orchestration/CommandCenter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function collapseTimelineRows(rows: any[]) {
  const collapsed: Array<any & { repeatCount: number }> = [];
  for (const row of rows) {
    // Filter out extremely low-signal "heartbeat", "view", or "session" actions
    const action = String(row.action ?? "").toUpperCase();
    if (["HEARTBEAT", "VIEW", "SESSION_START", "NAVIGATE"].includes(action)) continue;

    const previous = collapsed[collapsed.length - 1];
    const isDuplicate =
      previous &&
      previous.project_id === row.project_id &&
      previous.entity_type === row.entity_type &&
      previous.action === row.action &&
      // Smart match: if summaries are mostly similar, group them
      (previous.summary === row.summary || (row.summary && previous.summary && row.summary.substring(0, 30) === previous.summary.substring(0, 30))) &&
      (previous.actor_id === row.actor_id || previous.actor_role === row.actor_role);

    if (isDuplicate) {
      previous.repeatCount += 1;
      continue;
    }
    
    collapsed.push({ ...row, repeatCount: 1 });
  }
  return collapsed;
}

function toOperationalWorkflowLabel(state?: string | null) {
  const value = String(state ?? "").toUpperCase();
  if (["UNDER_REVIEW", "UNDER_L3_REVIEW", "READY_FOR_L3", "L1_REVIEW", "SUBMITTED"].includes(value)) return "Needs review";
  if (value === "CLARIFICATION") return "Clarification";
  if (value === "REJECTED") return "Rejected";
  if (["APPROVED", "COMPLETE"].includes(value)) return "Approved";
  return "In progress";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ project?: string; action?: string; entity?: string; actor_role?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const [user, projects, ownerQueue, insights, myTasks, roleTasks, runtimeSummary, actionQueue, reviewQueue, blockerQueue] = await Promise.all([
    getCurrentUser(),
    getDashboardProjects(),
    getOwnerReviewQueue(),
    getExecutiveInsights(),
    getTasksForUser(),
    getRoleTasks(),
    getRuntimeDesyncSummary(),
    getUserActionQueue(),
    getUserReviewQueue(),
    getUserBlockerQueue(),
  ]);
  const [timelineRows] = await Promise.all([
    getAuditTimeline({
      projectId: resolvedSearchParams?.project,
      action: resolvedSearchParams?.action,
      entityType: resolvedSearchParams?.entity,
      actorRole: resolvedSearchParams?.actor_role,
      limit: 80,
    }),
  ]);
  const condensedTimelineRows = collapseTimelineRows(timelineRows);
  const roi = await getRoiSnapshot();
  const activeRole = user?.role ?? "consultant";
  const canCreateProject = ["super_user", "super_admin"].includes(activeRole);
  const isL3Operational = ["project_admin", "super_admin", "L3", "L5", "super_user"].includes(activeRole);
  const clientMode = activeRole === "client";
  const primaryProjectId = projects[0]?.id ?? null;
  const checklist = primaryProjectId ? await getOrCreateOnboardingChecklist(primaryProjectId) : null;
  const isOwner = activeRole === "owner";

  const totals = {
    totalCredits: projects.reduce((sum, project) => sum + (project.totalCredits || 0), 0),
    uploadedDocs: projects.reduce((sum, project) => sum + (project.uploadedDocs || 0), 0),
    mandatoryCreditsMet: projects.reduce((sum, project) => sum + (project.mandatoryCreditsMet || 0), 0),
    openRemarks: projects.reduce((sum, project) => sum + (project.openRemarks || 0), 0),
  };

  const totalTokensLoaded = projects.reduce((sum, project) => {
    const used = Math.max(project.documentCreditsUsed || 0, 0);
    const remaining = Math.max(project.documentCreditsRemaining || 0, 0);
    return sum + used + remaining;
  }, 0);
  const totalTokensUsed = projects.reduce((sum, project) => sum + Math.max(project.documentCreditsUsed || 0, 0), 0);
  const totalTokensRemaining = projects.reduce((sum, project) => sum + Math.max(project.documentCreditsRemaining || 0, 0), 0);
  const weeklyTokenBurn = Math.max(
    1,
    Math.round(
      projects.reduce((sum, project) => {
        const docs = Math.max(project.documentCreditsUsed || 0, 0);
        const consult = Math.max(project.consultantCreditsUsed || 0, 0);
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
    ? Math.round(projects.reduce((sum, project) => sum + (project.overallCompletion || 0), 0) / projects.length)
    : 0;
  const projectedRating = overallCompletionPct >= 80 ? "Gold" : overallCompletionPct >= 60 ? "Silver" : "Certified";
  const projectedOutcome =
    overallCompletionPct >= 80
      ? "High confidence: target likely on current pace."
      : overallCompletionPct >= 60
        ? "Moderate confidence: needs steady weekly closure."
        : "At risk: improve upload and review velocity.";
  const approvalBase = projects.reduce(
    (sum, project) => sum + Math.max((project.pendingReviewsCount || 0) + (project.rejectedCount || 0), 0),
    0,
  );
  const rejectionTotal = projects.reduce((sum, project) => sum + Math.max(project.rejectedCount || 0, 0), 0);
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
    const atRiskCount = projects.filter((p) => (p.statusFlag ?? "green") !== "green").length;

    if (activeRole === "owner") {
      return [
        `Clear your review queue (${ownerQueue.length} pending) to keep vendor submissions moving.`,
        stuckTop
          ? `Escalate ${stuckTop.projectName} / ${stuckTop.creditCode}: ${stuckTop.missingDoc}.`
          : "No major blocker detected. Continue daily PM-review sweeps.",
        "Use precise send-back remarks so contributors can resubmit without calls.",
      ];
    }
    if (activeRole === "project_admin" || activeRole === "super_admin" || activeRole === "L3" || activeRole === "L5" || activeRole === "super_user") {
      return [
        `Prioritize ${atRiskCount} at-risk project(s) first in validation queue.`,
        stuckTop
          ? `Resolve top blocker: ${stuckTop.projectName} / ${stuckTop.creditCode} (${stuckTop.responsibleRole}).`
          : "No blocker cluster detected. Push PM-approved documents to final decision.",
        "Close repeated rejection reasons with template-based corrective guidance.",
      ];
    }
    if (activeRole === "client") {
      return [
        `Review ${atRiskCount} at-risk location(s) and escalate delayed vendors.`,
        "Portfolio health is being monitored; ensure all stakeholders are active.",
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


  return (
    <Shell
      title={clientMode ? "Client Dashboard" : `${roleLabels[activeRole]} Dashboard`}
      description={
        clientMode
          ? "AI-native green certification operating system. Real-time preflight and workflow orchestration."
          : "Unified AI Operational Command Center. Real-time checklist actions and stage-gate readiness."
      }
      role={activeRole}
      email={user?.email}
      notificationCount={projects.reduce((sum, project) => sum + (project.openRemarks || 0), 0)}
    >
      <RefreshTrigger intervalMs={isL3Operational ? 60000 : 120000} />
      <CommandCenter
        user={user ? { id: user.id, name: user.email ? user.email.split("@")[0] : "Operator", role: user.role as any, email: user.email } : null}
        initialProjects={projects.map(p => ({
          id: p.id,
          name: p.name,
          client: p.client,
          location: p.location || "TBD",
          certification_type: p.certification_type,
          overallCompletion: p.overallCompletion,
          status: p.status,
          statusFlag: (p.statusFlag || "green") as any,
          totalCredits: p.totalCredits,
          uploadedDocs: p.uploadedDocs,
          mandatoryCreditsMet: p.mandatoryCreditsMet,
          openRemarks: p.openRemarks,
          membersCount: p.membersCount,
          role: p.role as any,
          documentCreditsRemaining: p.documentCreditsRemaining,
          documentCreditsUsed: p.documentCreditsUsed
        }))}
        actionQueue={actionQueue}
        reviewQueue={reviewQueue}
        blockerQueue={blockerQueue}
        myTasks={myTasks}
        roleTasks={roleTasks}
        insights={insights}
        runtimeSummary={runtimeSummary}
        timeline={condensedTimelineRows}
      />
    </Shell>
  );
}

