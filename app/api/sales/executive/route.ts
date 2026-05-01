import { NextResponse } from "next/server";
import { getCurrentUser, getDashboardProjects, getExecutiveInsights } from "@/lib/data";
import { getRoiSnapshot } from "@/lib/services/roi-service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [projects, insights, roi] = await Promise.all([
    getDashboardProjects(),
    getExecutiveInsights(),
    getRoiSnapshot(),
  ]);

  const totalProjects = projects.length;
  const avgCompletion =
    totalProjects > 0
      ? Math.round(projects.reduce((sum, project) => sum + Number(project.overallCompletion ?? 0), 0) / totalProjects)
      : 0;
  const atRisk = projects.filter((project) => (project.statusFlag ?? "green") !== "green").length;
  const pendingReviews = projects.reduce((sum, project) => sum + Number(project.pendingReviewsCount ?? 0), 0);
  const rejected = projects.reduce((sum, project) => sum + Number(project.rejectedCount ?? 0), 0);

  return NextResponse.json({
    portfolio: {
      totalProjects,
      avgCompletion,
      atRisk,
      pendingReviews,
      rejected,
    },
    efficiency: {
      projectComparisons: insights.projectComparisons,
      rejectionPatterns: insights.rejectionPatterns,
      vendorStats: insights.vendorStats,
    },
    roi,
  });
}
