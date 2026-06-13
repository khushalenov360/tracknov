"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificationGapEngine = void 0;
class CertificationGapEngine {
    static calculateCertificationGap(projectId, runtimeContext) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            let securedPoints = 0;
            let riskPoints = 0;
            const credits = (runtimeContext.credits || []).filter((c) => !c.na);
            const highestRiskCredits = [];
            let totalPoints = 0;
            for (const credit of credits) {
                const points = Number((_b = (_a = credit.points) !== null && _a !== void 0 ? _a : credit.max_points) !== null && _b !== void 0 ? _b : 0);
                totalPoints += points;
                if (credit.status === "APPROVED" || credit.completion_pct === 100) {
                    securedPoints += points;
                }
                else if (credit.status === "BLOCKED" || credit.completion_pct < 50) {
                    riskPoints += points;
                    highestRiskCredits.push(credit.credit_code);
                }
            }
            const projectedPoints = totalPoints - riskPoints;
            let targetCertification = "Gold";
            let targetPoints = 60;
            if (totalPoints < 10) {
                targetPoints = Math.max(1, Math.round(totalPoints * 0.6));
            }
            let narrative = "";
            if (securedPoints >= targetPoints) {
                targetCertification = "Platinum";
                targetPoints = totalPoints < 10 ? Math.round(totalPoints * 0.8) : 80;
                narrative = "Gold is already secured.\n\nHowever:\n";
            }
            else {
                narrative = `Targeting ${targetCertification}.\n\n`;
            }
            const missingPoints = Math.max(0, targetPoints - securedPoints);
            if (riskPoints > 0) {
                narrative += `${riskPoints} points remain at risk.\n\nIf these risks materialize,\n${targetCertification} becomes unattainable.\n\nHighest risk credits:\n` + highestRiskCredits.map(c => `- ${c}`).join("\n");
                narrative += "\n\nRecommended mitigation:\nResolve rejected evidence immediately.";
            }
            else {
                narrative += `On track for ${targetCertification}.`;
            }
            return {
                currentPoints: securedPoints,
                securedPoints,
                riskPoints,
                projectedPoints,
                targetCertification,
                missingPoints,
                narrative,
                highestRiskCredits
            };
        });
    }
}
exports.CertificationGapEngine = CertificationGapEngine;
