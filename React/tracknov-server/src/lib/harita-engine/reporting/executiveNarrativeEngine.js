"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutiveNarrativeEngine = void 0;
class ExecutiveNarrativeEngine {
    /**
     * Compiles executive board-ready summaries and ESG ratings using raw submittal status records
     */
    static compileNarrative(projectName, progress, stalledCount, qualityMetric) {
        let esgReadinessRating = "C";
        if (progress >= 85 && stalledCount === 0) {
            esgReadinessRating = "A";
        }
        else if (progress >= 60 && stalledCount < 2) {
            esgReadinessRating = "B";
        }
        else if (stalledCount > 4) {
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
exports.ExecutiveNarrativeEngine = ExecutiveNarrativeEngine;
