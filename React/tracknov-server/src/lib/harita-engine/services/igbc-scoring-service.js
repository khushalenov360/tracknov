"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateStructuredCredit = evaluateStructuredCredit;
exports.computeIgbcScore = computeIgbcScore;
const igbc_score_authority_1 = require("./igbc-score-authority");
function evaluateStructuredCredit(creditType, projectMetadata, data) {
    switch (creditType) {
        case "CHILLER":
            return igbc_score_authority_1.IgbcScoreAuthority.verifyChillerEfficiency(data, projectMetadata);
        case "RAINWATER":
            return igbc_score_authority_1.IgbcScoreAuthority.verifyRainwaterHarvesting(data, projectMetadata);
        case "MATERIAL":
            return igbc_score_authority_1.IgbcScoreAuthority.verifyRecycledContentValue(data, projectMetadata);
        default:
            throw new Error(`Unsupported structured credit type: ${creditType}`);
    }
}
function ratingFromPct(pct) {
    if (pct >= 80)
        return "Platinum";
    if (pct >= 60)
        return "Gold";
    if (pct >= 50)
        return "Silver";
    if (pct >= 40)
        return "Certified";
    return "Pre-Certification";
}
function computeIgbcScore(workspace) {
    var _a;
    const credits = (_a = workspace.credits) !== null && _a !== void 0 ? _a : [];
    const totalCredits = credits.length;
    const mandatoryTotal = credits.filter((credit) => credit.is_mandatory).length;
    const mandatoryApproved = credits.filter((credit) => credit.is_mandatory && credit.status === "complete").length;
    const byStage = {
        DESIGN: { total: 0, complete: 0, scorePct: 0, projectedRating: "Pre-Certification" },
        CONSTRUCTION: { total: 0, complete: 0, scorePct: 0, projectedRating: "Pre-Certification" },
    };
    for (const credit of credits) {
        const stageOfCredit = credit.documents.some((document) => { var _a; return String((_a = document.source_stage) !== null && _a !== void 0 ? _a : "").toUpperCase() === "CONSTRUCTION"; })
            ? "CONSTRUCTION"
            : "DESIGN";
        byStage[stageOfCredit].total += 1;
        if (credit.status === "complete") {
            byStage[stageOfCredit].complete += 1;
        }
    }
    Object.keys(byStage).forEach((stage) => {
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
