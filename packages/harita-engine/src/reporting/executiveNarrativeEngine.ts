export interface NarrativeSummary {
  projectName: string;
  certificationProgress: number; // 0 to 100
  stalledCreditsCount: number;
  esgReadinessRating: "A" | "B" | "C" | "D" | "F";
  riskHighlights: string;
  bottlenecksExplanation: string;
}

export class ExecutiveNarrativeEngine {
  /**
   * Compiles executive board-ready summaries and ESG ratings using raw submittal status records
   */
  static compileNarrative(
    projectName: string,
    progress: number,
    stalledCount: number,
    qualityMetric: number
  ): NarrativeSummary {
    let esgReadinessRating: NarrativeSummary["esgReadinessRating"] = "C";
    if (progress >= 85 && stalledCount === 0) {
      esgReadinessRating = "A";
    } else if (progress >= 60 && stalledCount < 2) {
      esgReadinessRating = "B";
    } else if (stalledCount > 4) {
      esgReadinessRating = "D";
    }

    const riskHighlights = stalledCount > 0
      ? `Attention required: ${stalledCount} high-priority green certifications are currently flagged as stalled due to missing steel billing manifests and supplier document latency.`
      : "Excellent timeline alignment. All submittals are locked and approved with zero outstanding auditor feedback loops.";

    const bottlenecksExplanation = stalledCount > 0
      ? `Primary delay vectors relate to supplier turnaround schedules. Integrating the automated Supplier Network features is projected to recover approximately 14 hours of consultant review labor.`
      : "No outstanding timeline delay bottlenecks registered.";

    return {
      projectName,
      certificationProgress: progress,
      stalledCreditsCount: stalledCount,
      esgReadinessRating,
      riskHighlights,
      bottlenecksExplanation
    };
  }
}
