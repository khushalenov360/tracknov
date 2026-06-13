"use strict";
// ============================================================
// DecisionIntelligenceEngine
//
// Compares multiple possible actions and ranks them by ROI.
// Mandatory ROI formula (from specification):
//
//   roiScore = (certificationGain * 0.35)
//            + (readinessGain    * 0.30)
//            + (riskReduction    * 0.25)
//            - (effortRequired   * 0.10)
//
// Harita must not only describe — it must compare options and
// explain why one action is better than another.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionIntelligenceEngine = void 0;
class DecisionIntelligenceEngine {
    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------
    static evaluate(input) {
        const options = this.buildOptions(input);
        const ranked = this.rank(options);
        const winner = ranked.length > 0 ? ranked[0] : null;
        const comparisons = this.buildComparisons(ranked, input);
        const reasoning = this.buildReasoning(ranked, winner);
        return { options: ranked, winner, reasoning, comparisons };
    }
    // -------------------------------------------------------------------------
    // Build decision options from all available intelligence
    // -------------------------------------------------------------------------
    static buildOptions(input) {
        var _a;
        const options = [];
        // Option class A: Resolve rejected evidence (highest urgency)
        for (const gap of input.evidenceGaps || []) {
            if (gap.rejectedDocuments.length > 0) {
                const certificationGain = 70;
                const readinessGain = 85;
                const riskReduction = 90;
                const effortRequired = 30; // Resubmission is low effort
                options.push({
                    id: `resolve-rejected-${gap.creditCode}`,
                    title: `Resolve rejected evidence for ${gap.creditCode}`,
                    certificationGain,
                    readinessGain,
                    riskReduction,
                    effortRequired,
                    roiScore: this.roi(certificationGain, readinessGain, riskReduction, effortRequired),
                    rationale: `Rejected evidence for ${gap.creditCode} is a hard submission blocker. Resolving it immediately removes the blocker and restores readiness.`,
                });
            }
        }
        // Option class B: Complete missing evidence
        for (const gap of input.evidenceGaps || []) {
            if (gap.missingDocuments.length > 0) {
                const certificationGain = 50;
                const readinessGain = 60;
                const riskReduction = 55;
                const effortRequired = 55; // New document upload is moderate effort
                options.push({
                    id: `complete-missing-${gap.creditCode}`,
                    title: `Submit missing evidence for ${gap.creditCode}`,
                    certificationGain,
                    readinessGain,
                    riskReduction,
                    effortRequired,
                    roiScore: this.roi(certificationGain, readinessGain, riskReduction, effortRequired),
                    rationale: `${gap.creditCode} is missing ${gap.missingDocuments.length} document(s). Uploading them advances credit completion significantly.`,
                });
            }
        }
        // Option class C: Address highest-risk credits from certification gap
        for (const code of ((_a = input.certificationGap) === null || _a === void 0 ? void 0 : _a.highestRiskCredits) || []) {
            const certificationGain = 60;
            const readinessGain = 40;
            const riskReduction = 75;
            const effortRequired = 50;
            options.push({
                id: `mitigate-risk-${code}`,
                title: `Mitigate certification risk for ${code}`,
                certificationGain,
                readinessGain,
                riskReduction,
                effortRequired,
                roiScore: this.roi(certificationGain, readinessGain, riskReduction, effortRequired),
                rationale: `${code} is flagged as a high-risk credit threatening the target certification. Stabilising it prevents score regression.`,
            });
        }
        // Option class D: Rebalance overloaded contributors
        const overloaded = (input.workloads || []).filter((w) => w.predictedOverload);
        if (overloaded.length > 0) {
            const certificationGain = 30;
            const readinessGain = 50;
            const riskReduction = 45;
            const effortRequired = 20; // Assignment change is low effort
            options.push({
                id: `rebalance-workload`,
                title: `Rebalance workload — ${overloaded.map((w) => w.contributorName).join(", ")} overloaded`,
                certificationGain,
                readinessGain,
                riskReduction,
                effortRequired,
                roiScore: this.roi(certificationGain, readinessGain, riskReduction, effortRequired),
                rationale: `${overloaded.length} contributor(s) are at predicted overload. Reassigning items prevents delivery delays.`,
            });
        }
        // De-duplicate by id
        const seen = new Set();
        return options.filter((o) => {
            if (seen.has(o.id))
                return false;
            seen.add(o.id);
            return true;
        });
    }
    // -------------------------------------------------------------------------
    // ROI formula — mandatory per specification
    // -------------------------------------------------------------------------
    static roi(certificationGain, readinessGain, riskReduction, effortRequired) {
        const raw = certificationGain * 0.35 +
            readinessGain * 0.30 +
            riskReduction * 0.25 -
            effortRequired * 0.10;
        return Math.round(raw * 100) / 100;
    }
    // -------------------------------------------------------------------------
    // Sort descending by roiScore
    // -------------------------------------------------------------------------
    static rank(options) {
        return [...options].sort((a, b) => b.roiScore - a.roiScore);
    }
    // -------------------------------------------------------------------------
    // Build standard question-answer comparisons
    // -------------------------------------------------------------------------
    static buildComparisons(ranked, input) {
        const comparisons = [];
        // Q1: Which action provides highest ROI?
        if (ranked.length > 0) {
            comparisons.push({
                questionAnswered: "Which action provides highest ROI?",
                answer: `"${ranked[0].title}" with ROI score ${ranked[0].roiScore}. ${ranked[0].rationale}`,
                winner: ranked[0],
                runnerUp: ranked[1],
            });
        }
        // Q2: Which action reduces risk most?
        const byRisk = [...ranked].sort((a, b) => b.riskReduction - a.riskReduction);
        if (byRisk.length > 0) {
            comparisons.push({
                questionAnswered: "Which action reduces risk most?",
                answer: `"${byRisk[0].title}" reduces risk by ${byRisk[0].riskReduction} points.`,
                winner: byRisk[0],
                runnerUp: byRisk[1],
            });
        }
        // Q3: Which blocked credit should be resolved first?
        const rejectionOptions = ranked.filter((o) => o.id.startsWith("resolve-rejected-"));
        if (rejectionOptions.length > 0) {
            comparisons.push({
                questionAnswered: "Which blocked credit should be resolved first?",
                answer: `Resolve "${rejectionOptions[0].title}" first — it is the highest-ROI unblock action with score ${rejectionOptions[0].roiScore}.`,
                winner: rejectionOptions[0],
                runnerUp: rejectionOptions[1],
            });
        }
        else {
            comparisons.push({
                questionAnswered: "Which blocked credit should be resolved first?",
                answer: "No rejected-evidence blockers detected in the current project state.",
            });
        }
        // Q4: Which task provides maximum certification gain?
        const byCertGain = [...ranked].sort((a, b) => b.certificationGain - a.certificationGain);
        if (byCertGain.length > 0) {
            comparisons.push({
                questionAnswered: "Which task provides maximum certification gain?",
                answer: `"${byCertGain[0].title}" provides the maximum certification gain of ${byCertGain[0].certificationGain} points.`,
                winner: byCertGain[0],
                runnerUp: byCertGain[1],
            });
        }
        return comparisons;
    }
    // -------------------------------------------------------------------------
    // Prose reasoning to explain the winner
    // -------------------------------------------------------------------------
    static buildReasoning(ranked, winner) {
        var _a;
        if (!winner) {
            return "No actionable decision options were identified from the current project state.";
        }
        const lines = [];
        lines.push(`The highest-priority action is: "${winner.title}" (ROI Score: ${winner.roiScore}).`);
        lines.push((_a = winner.rationale) !== null && _a !== void 0 ? _a : "");
        if (ranked.length > 1) {
            lines.push(`Compared to the next option "${ranked[1].title}" (ROI Score: ${ranked[1].roiScore}), ` +
                `"${winner.title}" scores higher due to ${winner.certificationGain > ranked[1].certificationGain ? "superior certification gain" : winner.riskReduction > ranked[1].riskReduction ? "greater risk reduction" : "better overall ROI balance"}.`);
        }
        return lines.filter(Boolean).join(" ");
    }
}
exports.DecisionIntelligenceEngine = DecisionIntelligenceEngine;
