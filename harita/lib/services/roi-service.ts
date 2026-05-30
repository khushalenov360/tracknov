import { getDashboardProjects, getExecutiveInsights } from "@/lib/data";

type RoiSnapshot = {
  calculatedAt: string;
  assumptions: {
    avgReviewMinutes: number;
    reworkReductionPct: number;
    hourlyCostInr: number;
  };
  totals: {
    projects: number;
    documentsProcessed: number;
    rejectionReductionPct: number;
    timeSavedHours: number;
    costSavedInr: number;
  };
};

let roiCache: { expiresAt: number; payload: RoiSnapshot } | null = null;

export async function getRoiSnapshot(): Promise<RoiSnapshot> {
  const now = Date.now();
  if (roiCache && roiCache.expiresAt > now) {
    return roiCache.payload;
  }

  const [projects, insights] = await Promise.all([getDashboardProjects(), getExecutiveInsights()]);
  const documentsProcessed = projects.reduce((sum, project) => sum + Number(project.uploadedDocs ?? 0), 0);
  const rejectionRate = Math.min(
    100,
    Math.max(
      0,
      insights.projectComparisons.length
        ? Math.round(
            insights.projectComparisons.reduce((sum, row) => {
              const reviewed = Number(row.pending ?? 0) + Number(row.rejected ?? 0);
              if (!reviewed) return sum;
              return sum + Math.round((Number(row.rejected ?? 0) / reviewed) * 100);
            }, 0) / insights.projectComparisons.length,
          )
        : 0,
    ),
  );

  const assumptions = {
    avgReviewMinutes: Number(process.env.ROI_AVG_REVIEW_MINUTES ?? 12),
    reworkReductionPct: Number(process.env.ROI_REWORK_REDUCTION_PCT ?? 35),
    hourlyCostInr: Number(process.env.ROI_HOURLY_COST_INR ?? 1500),
  };

  const timeSavedHours =
    (documentsProcessed *
      assumptions.avgReviewMinutes *
      (Math.max(0, assumptions.reworkReductionPct) / 100)) /
    60;
  const costSavedInr = Math.round(timeSavedHours * assumptions.hourlyCostInr);
  const rejectionReductionPct = Math.max(
    0,
    Math.min(100, Math.round((rejectionRate * assumptions.reworkReductionPct) / 100)),
  );

  const payload: RoiSnapshot = {
    calculatedAt: new Date().toISOString(),
    assumptions,
    totals: {
      projects: projects.length,
      documentsProcessed,
      rejectionReductionPct,
      timeSavedHours: Math.round(timeSavedHours),
      costSavedInr,
    },
  };

  roiCache = {
    payload,
    expiresAt: now + 5 * 60 * 1000,
  };

  return payload;
}
