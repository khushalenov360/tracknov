import type { ProjectWorkspace } from "@/lib/types";

type StageName = "DESIGN" | "CONSTRUCTION";

function ratingFromPct(pct: number) {
  if (pct >= 80) return "Platinum";
  if (pct >= 60) return "Gold";
  if (pct >= 50) return "Silver";
  if (pct >= 40) return "Certified";
  return "Pre-Certification";
}

export function computeIgbcScore(workspace: ProjectWorkspace) {
  const credits = workspace.credits ?? [];
  const totalCredits = credits.length;
  const mandatoryTotal = credits.filter((credit) => credit.is_mandatory).length;
  const mandatoryApproved = credits.filter((credit) => credit.is_mandatory && credit.status === "complete").length;

  const byStage: Record<StageName, { total: number; complete: number; scorePct: number; projectedRating: string }> = {
    DESIGN: { total: 0, complete: 0, scorePct: 0, projectedRating: "Pre-Certification" },
    CONSTRUCTION: { total: 0, complete: 0, scorePct: 0, projectedRating: "Pre-Certification" },
  };

  for (const credit of credits) {
    const stageOfCredit: StageName = credit.documents.some((document: any) => String(document.source_stage ?? "").toUpperCase() === "CONSTRUCTION")
      ? "CONSTRUCTION"
      : "DESIGN";
    byStage[stageOfCredit].total += 1;
    if (credit.status === "complete") {
      byStage[stageOfCredit].complete += 1;
    }
  }

  (Object.keys(byStage) as StageName[]).forEach((stage) => {
    const total = Math.max(byStage[stage].total, 1);
    const pct = Math.round((byStage[stage].complete / total) * 100);
    byStage[stage].scorePct = pct;
    byStage[stage].projectedRating = ratingFromPct(pct);
  });

  const overallPct = totalCredits ? Math.round((credits.filter((credit) => credit.status === "complete").length / totalCredits) * 100) : 0;

  return {
    projectId: workspace.project.id,
    totalCredits,
    mandatory: {
      total: mandatoryTotal,
      approved: mandatoryApproved,
      complete: mandatoryTotal > 0 ? mandatoryApproved === mandatoryTotal : false,
    },
    overall: {
      scorePct: overallPct,
      projectedRating: ratingFromPct(overallPct),
    },
    stages: byStage,
  };
}
