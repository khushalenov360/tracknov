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
exports.ExecutivePrioritizationEngine = void 0;
class ExecutivePrioritizationEngine {
    static getTopActions(projectId, runtimeContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const actions = [];
            const credits = runtimeContext.credits || [];
            const documents = runtimeContext.documents || [];
            for (const credit of credits) {
                if (credit.status === "APPROVED" || credit.na)
                    continue;
                const rejectedDocs = documents.filter((d) => d.doc_category === credit.credit_code && d.state === "REJECTED");
                if (rejectedDocs.length > 0) {
                    const readinessGain = 80;
                    const certificationImpact = 70;
                    const riskReduction = 90;
                    const urgency = 100;
                    const impactScore = (readinessGain * 0.35) + (certificationImpact * 0.30) + (riskReduction * 0.20) + (urgency * 0.15);
                    actions.push({
                        id: `action-${credit.id}-rejected`,
                        title: `Resubmit rejected documents for ${credit.credit_code}`,
                        impactScore: Math.round(impactScore),
                        readinessGain,
                        certificationImpact,
                        riskReduction,
                        urgency,
                        rationale: "Rejected evidence strictly prevents submission until deficiencies are corrected."
                    });
                }
                if (credit.completion_pct < 50) {
                    const readinessGain = 60;
                    const certificationImpact = 50;
                    const riskReduction = 40;
                    const urgency = 60;
                    const impactScore = (readinessGain * 0.35) + (certificationImpact * 0.30) + (riskReduction * 0.20) + (urgency * 0.15);
                    actions.push({
                        id: `action-${credit.id}-progress`,
                        title: `Accelerate evidence gathering for ${credit.credit_code}`,
                        impactScore: Math.round(impactScore),
                        readinessGain,
                        certificationImpact,
                        riskReduction,
                        urgency,
                        rationale: "Credit is significantly behind schedule and needs immediate focus to prevent delays."
                    });
                }
            }
            return actions.sort((a, b) => b.impactScore - a.impactScore);
        });
    }
}
exports.ExecutivePrioritizationEngine = ExecutivePrioritizationEngine;
