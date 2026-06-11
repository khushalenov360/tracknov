import { NextResponse } from "next/server";
import { getProjectWorkspaceForApi } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await getProjectWorkspaceForApi(id);
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const credits = workspace.credits ?? [];
  const totalCredits = credits.length;
  const byStatus = {
    pending: credits.filter((credit) => credit.state === "pending").length,
    in_progress: credits.filter((credit) => credit.state === "in_progress").length,
    blocked: credits.filter((credit) => credit.state === "blocked").length,
    complete: credits.filter((credit) => credit.state === "complete").length,
  };
  const completionPct = totalCredits
    ? Math.round(
        credits.reduce((sum, credit) => sum + Number(credit.completion_pct ?? 0), 0) /
          totalCredits,
      )
    : 0;
  const activityLogs = workspace.activityLogs ?? [];
  const roleActivity = activityLogs.reduce<Record<string, number>>((acc, row) => {
    const role = String(row.actor_role ?? "unknown");
    acc[role] = (acc[role] ?? 0) + 1;
    return acc;
  }, {});

  const workflowCounts = {
    draft: credits.reduce(
      (sum, credit) =>
        sum +
        credit.documents.filter((document: any) => String(document.state ?? "").toUpperCase() === "DRAFT").length,
      0,
    ),
    ready: credits.reduce(
      (sum, credit) =>
        sum +
        credit.documents.filter((document: any) => String(document.state ?? "").toUpperCase() === "READY").length,
      0,
    ),
    submitted: credits.reduce(
      (sum, credit) =>
        sum +
        credit.documents.filter((document: any) => String(document.state ?? "").toUpperCase() === "SUBMITTED").length,
      0,
    ),
    under_review: credits.reduce(
      (sum, credit) =>
        sum +
        credit.documents.filter(
          (document: any) => String(document.state ?? "").toUpperCase() === "UNDER_REVIEW",
        ).length,
      0,
    ),
    clarification: credits.reduce(
      (sum, credit) =>
        sum +
        credit.documents.filter(
          (document: any) => String(document.state ?? "").toUpperCase() === "CLARIFICATION",
        ).length,
      0,
    ),
    resubmitted: credits.reduce(
      (sum, credit) =>
        sum +
        credit.documents.filter(
          (document: any) => String(document.state ?? "").toUpperCase() === "RESUBMITTED",
        ).length,
      0,
    ),
    approved: credits.reduce(
      (sum, credit) =>
        sum +
        credit.documents.filter((document: any) => String(document.state ?? "").toUpperCase() === "APPROVED").length,
      0,
    ),
    rejected: credits.reduce(
      (sum, credit) =>
        sum +
        credit.documents.filter((document: any) => String(document.state ?? "").toUpperCase() === "REJECTED").length,
      0,
    ),
    eliminated: credits.reduce(
      (sum, credit) =>
        sum +
        credit.documents.filter((document: any) => String(document.state ?? "").toUpperCase() === "ELIMINATED").length,
      0,
    ),
  };

  const stageAnalytics = {
    design: workflowCounts.draft + workflowCounts.ready + workflowCounts.submitted,
    construction: workflowCounts.under_review + workflowCounts.clarification + workflowCounts.resubmitted,
    handover: workflowCounts.approved + workflowCounts.rejected + workflowCounts.eliminated,
  };

  return NextResponse.json({
    project: {
      id: workspace.project.id,
      name: workspace.project.name,
      status: workspace.project.state,
      completion_pct: completionPct,
    },
    credits: {
      total: totalCredits,
      by_status: byStatus,
      mandatory_total: credits.filter((credit) => credit.is_mandatory).length,
      mandatory_complete: credits.filter(
        (credit) => credit.is_mandatory && credit.state === "complete",
      ).length,
    },
    documents: {
      total: credits.reduce((sum, credit) => sum + credit.documents.length, 0),
      workflow: workflowCounts,
    },
    analytics: {
      stage_load: stageAnalytics,
      role_activity: roleActivity,
    },
  });
}
