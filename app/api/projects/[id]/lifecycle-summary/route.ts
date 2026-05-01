import { NextResponse } from "next/server";
import { getProjectWorkspaceForApi } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const workspace = await getProjectWorkspaceForApi(params.id);
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const credits = workspace.credits ?? [];
  const totalCredits = credits.length;
  const byStatus = {
    pending: credits.filter((credit) => credit.status === "pending").length,
    in_progress: credits.filter((credit) => credit.status === "in_progress").length,
    blocked: credits.filter((credit) => credit.status === "blocked").length,
    complete: credits.filter((credit) => credit.status === "complete").length,
  };
  const completionPct = totalCredits
    ? Math.round(
        credits.reduce((sum, credit) => sum + Number(credit.completion_pct ?? 0), 0) /
          totalCredits,
      )
    : 0;

  return NextResponse.json({
    project: {
      id: workspace.project.id,
      name: workspace.project.name,
      status: workspace.project.status,
      completion_pct: completionPct,
    },
    credits: {
      total: totalCredits,
      by_status: byStatus,
      mandatory_total: credits.filter((credit) => credit.is_mandatory).length,
      mandatory_complete: credits.filter(
        (credit) => credit.is_mandatory && credit.status === "complete",
      ).length,
    },
    documents: {
      total: credits.reduce((sum, credit) => sum + credit.documents.length, 0),
      workflow: {
        draft: credits.reduce(
          (sum, credit) =>
            sum +
            credit.documents.filter((document) => document.workflow_state === "DRAFT").length,
          0,
        ),
        ready: credits.reduce(
          (sum, credit) =>
            sum +
            credit.documents.filter((document) => document.workflow_state === "READY").length,
          0,
        ),
        submitted: credits.reduce(
          (sum, credit) =>
            sum +
            credit.documents.filter((document) => document.workflow_state === "SUBMITTED").length,
          0,
        ),
        under_review: credits.reduce(
          (sum, credit) =>
            sum +
            credit.documents.filter(
              (document) => document.workflow_state === "UNDER_REVIEW",
            ).length,
          0,
        ),
        clarification: credits.reduce(
          (sum, credit) =>
            sum +
            credit.documents.filter(
              (document) => document.workflow_state === "CLARIFICATION",
            ).length,
          0,
        ),
        resubmitted: credits.reduce(
          (sum, credit) =>
            sum +
            credit.documents.filter(
              (document) => document.workflow_state === "RESUBMITTED",
            ).length,
          0,
        ),
        approved: credits.reduce(
          (sum, credit) =>
            sum +
            credit.documents.filter((document) => document.workflow_state === "APPROVED").length,
          0,
        ),
        rejected: credits.reduce(
          (sum, credit) =>
            sum +
            credit.documents.filter((document) => document.workflow_state === "REJECTED").length,
          0,
        ),
      },
    },
  });
}

