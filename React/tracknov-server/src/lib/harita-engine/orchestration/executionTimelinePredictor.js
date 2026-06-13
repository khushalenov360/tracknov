"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionTimelinePredictor = void 0;
class ExecutionTimelinePredictor {
    /**
     * Generates confidence-adjusted green submittal approval schedules and highlights hotspots
     */
    static predictTimeline(input) {
        let delayDays = 5; // baseline execution delay in days
        // 1. Incorporate historic clarification counts
        delayDays += input.historicalClarificationsCount * 4.5;
        // 2. Adjust for reviewer backlog congestion
        const reviewerCongestionFactor = parseFloat(Math.max(1, 10 - input.reviewerVelocityIndex).toFixed(1));
        delayDays += reviewerCongestionFactor * 1.5;
        // 3. Supplier communication delays
        delayDays += input.supplierResponseDelayDays;
        // 4. Quality multipliers
        if (input.documentIntegrityQuality < 70) {
            delayDays += (70 - input.documentIntegrityQuality) * 0.4;
        }
        const totalDaysToAdd = Math.round(delayDays);
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + totalDaysToAdd);
        // Identify risk severity
        let stalledRiskLevel = "LOW";
        if (totalDaysToAdd > 25) {
            stalledRiskLevel = "HIGH";
        }
        else if (totalDaysToAdd > 12) {
            stalledRiskLevel = "MEDIUM";
        }
        // Capture hotspots
        const hotspots = [];
        if (input.historicalClarificationsCount > 2) {
            hotspots.push("Clarification Frequency Drift");
        }
        if (reviewerCongestionFactor > 6) {
            hotspots.push("Auditor Backlog Congestion");
        }
        if (input.documentIntegrityQuality < 60) {
            hotspots.push("Weak Ingestion Evidence Integrity");
        }
        return {
            targetApprovalDate: targetDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
            }),
            reviewerCongestionFactor,
            criticalPathDelayDays: totalDaysToAdd,
            stalledRiskLevel,
            hotspots
        };
    }
}
exports.ExecutionTimelinePredictor = ExecutionTimelinePredictor;
