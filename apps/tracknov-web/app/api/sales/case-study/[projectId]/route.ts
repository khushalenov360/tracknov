import { NextResponse } from "next/server";
import { getDashboardProjects, getProjectWorkspaceForApi } from "@/lib/data";
import { getRoiSnapshot } from "@tracknov/harita-engine/services/roi-service";
import { canAccessBillingAndInvoice } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const workspace = await getProjectWorkspaceForApi(projectId);
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canAccessBillingAndInvoice(workspace.userRole)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const [projects, roi] = await Promise.all([getDashboardProjects(), getRoiSnapshot()]);
  const project = projects.find((item) => item.id === projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const completion = Math.round(project.overallCompletion ?? 0);
  const rejectionRate = Math.min(100, Math.max(0, Math.round(((project.rejectedCount ?? 0) / Math.max(project.pendingReviewsCount ?? 1, 1)) * 100)));
  const estimatedTimeSavedHours = Math.max(0, Math.round((project.uploadedDocs ?? 0) * Number(roi.assumptions.avgReviewMinutes ?? 8) * 0.35 / 60));
  const estimatedCostSaved = Math.max(0, Math.round(estimatedTimeSavedHours * Number(roi.assumptions.hourlyCostInr ?? 1500)));

  const markdown = [
    `# Tracknov Case Study - ${project.name}`,
    ``,
    `## Portfolio Snapshot`,
    `- Client: ${project.client || "N/A"}`,
    `- Location: ${project.location || "N/A"}`,
    `- Completion: ${completion}%`,
    `- Target Rating: ${project.target_rating || "Certified"}`,
    ``,
    `## Workflow Efficiency`,
    `- Pending Review Queue: ${project.pendingReviewsCount ?? 0}`,
    `- Rejected Documents: ${project.rejectedCount ?? 0}`,
    `- Estimated Rejection Rate: ${rejectionRate}%`,
    ``,
    `## Business Impact`,
    `- Estimated Time Saved: ${estimatedTimeSavedHours} hours`,
    `- Estimated Cost Saved: INR ${estimatedCostSaved}`,
    `- Token Usage (Docs): ${project.documentCreditsUsed ?? 0}`,
    `- Token Remaining (Docs): ${project.documentCreditsRemaining ?? 0}`,
    ``,
    `## Submission Readiness`,
    `- Mandatory Credits Met: ${project.mandatoryCreditsMet ?? 0}`,
    `- Total Credits: ${project.totalCredits ?? 0}`,
    `- Current Status: ${(project.statusFlag ?? "green").toUpperCase()}`,
    ``,
    `Generated: ${new Date().toISOString()}`,
  ].join("\n");

  const wantsDownload = new URL(request.url).searchParams.get("download") === "1";
  if (wantsDownload) {
    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${project.name.replace(/\s+/g, "-").toLowerCase()}-case-study.md\"`,
      },
    });
  }

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      client: project.client,
      location: project.location,
      completion,
      targetRating: project.target_rating,
    },
    metrics: {
      pendingReviews: project.pendingReviewsCount ?? 0,
      rejectedDocuments: project.rejectedCount ?? 0,
      rejectionRate,
      estimatedTimeSavedHours,
      estimatedCostSavedInr: estimatedCostSaved,
      documentCreditsUsed: project.documentCreditsUsed ?? 0,
      documentCreditsRemaining: project.documentCreditsRemaining ?? 0,
      mandatoryCreditsMet: project.mandatoryCreditsMet ?? 0,
      totalCredits: project.totalCredits ?? 0,
      statusFlag: project.statusFlag ?? "green",
    },
    shareableReport: markdown,
    downloadUrl: `/api/sales/case-study/${project.id}?download=1`,
  });
}
