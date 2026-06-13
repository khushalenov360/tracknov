"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.certificationStrategyEngine = exports.CertificationStrategyEngine = void 0;
class CertificationStrategyEngine {
    calculateScore(credits) {
        return credits
            .filter((c) => !c.na && (c.state === "APPROVED" || c.state === "complete"))
            .reduce((sum, c) => { var _a; return sum + Number((_a = c.max_points) !== null && _a !== void 0 ? _a : 0); }, 0);
    }
    getStrategy(credits) {
        var _a, _b;
        const activeCredits = credits.filter(c => !c.na);
        const currentScore = this.calculateScore(activeCredits);
        // Use status field (uppercase) — the state alias was incorrect
        const blockedCredits = activeCredits.filter(c => c.status === "BLOCKED" || c.state === "BLOCKED" || c.state === "blocked");
        const blockedPoints = blockedCredits.reduce((sum, c) => { var _a; return sum + Number((_a = c.max_points) !== null && _a !== void 0 ? _a : 0); }, 0);
        const pendingCredits = activeCredits.filter(c => c.status !== "APPROVED" && c.status !== "complete" &&
            c.status !== "BLOCKED" && c.state !== "BLOCKED" && c.state !== "blocked");
        pendingCredits.sort((a, b) => { var _a, _b; return Number((_a = b.max_points) !== null && _a !== void 0 ? _a : 0) - Number((_b = a.max_points) !== null && _b !== void 0 ? _b : 0); });
        // totalAvailable = current + pending + blocked (max achievable if all resolved)
        const totalAvailable = currentScore +
            pendingCredits.reduce((sum, c) => { var _a; return sum + Number((_a = c.max_points) !== null && _a !== void 0 ? _a : 0); }, 0) +
            blockedPoints;
        const roadmapToGold = [];
        let simScore = currentScore;
        for (const c of pendingCredits) {
            if (simScore >= 60)
                break;
            roadmapToGold.push(c.credit_code);
            simScore += Number((_a = c.max_points) !== null && _a !== void 0 ? _a : 0);
        }
        const roadmapToPlatinum = [...roadmapToGold];
        for (const c of pendingCredits.slice(roadmapToGold.length)) {
            if (simScore >= 80)
                break;
            roadmapToPlatinum.push(c.credit_code);
            simScore += Number((_b = c.max_points) !== null && _b !== void 0 ? _b : 0);
        }
        const highRoiCredits = pendingCredits
            .map(c => {
            var _a;
            return ({
                credit: c.credit_code,
                roi: Number((_a = c.max_points) !== null && _a !== void 0 ? _a : 0) * (c.probability || 0.8), // Assume 80% if not set
                probabilityPercentile: (c.probability || 0.8) * 100
            });
        })
            .sort((a, b) => b.roi - a.roi)
            .slice(0, 3);
        return {
            currentScore,
            totalAvailable,
            blockedPoints,
            roadmapToGold,
            roadmapToPlatinum,
            highRiskCredits: blockedCredits.map(c => c.credit_code),
            highRoiCredits
        };
    }
    generateContextString(strategy) {
        const roiString = strategy.highRoiCredits
            ? strategy.highRoiCredits.map(r => `${r.credit} (${r.probabilityPercentile}% prob)`).join(", ")
            : "None";
        return `
[CERTIFICATION STRATEGY ENGINE]
Current Achievable Score: ${strategy.currentScore}
Total Possible Score: ${strategy.totalAvailable}
Blocked Points (High Risk): ${strategy.blockedPoints}
Fastest Route to Gold (60 pts): ${strategy.roadmapToGold.length ? strategy.roadmapToGold.join(", ") : "Achieved"}
Fastest Route to Platinum (80 pts): ${strategy.roadmapToPlatinum.length ? strategy.roadmapToPlatinum.join(", ") : "Achieved or Impossible"}
High Risk Credits: ${strategy.highRiskCredits.join(", ") || "None"}
Highest ROI Credits: ${roiString}
`;
    }
}
exports.CertificationStrategyEngine = CertificationStrategyEngine;
exports.certificationStrategyEngine = new CertificationStrategyEngine();
