"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImpactScoringEngine = void 0;
class ImpactScoringEngine {
    static calculateImpactScore(readinessGain, certificationImpact, dependencyWeight, reviewRiskReduction) {
        return ((readinessGain * 0.40) +
            (certificationImpact * 0.30) +
            (dependencyWeight * 0.20) +
            (reviewRiskReduction * 0.10));
    }
    static rankMissingEvidence(missingEvidenceList) {
        const scoredEvidence = missingEvidenceList.map(evidence => {
            // In a real implementation, these values would be dynamically calculated
            // based on the specific evidence, credit weights, and project graph.
            const readinessGain = evidence.readinessGain || Math.random() * 50;
            const certificationImpact = evidence.certificationImpact || Math.random() * 50;
            const dependencyWeight = evidence.dependencyWeight || Math.random() * 50;
            const reviewRiskReduction = evidence.reviewRiskReduction || Math.random() * 50;
            const totalImpactScore = this.calculateImpactScore(readinessGain, certificationImpact, dependencyWeight, reviewRiskReduction);
            return {
                evidenceName: evidence.name || "Unknown Document",
                readinessGain,
                certificationImpact,
                dependencyWeight,
                reviewRiskReduction,
                totalImpactScore
            };
        });
        return scoredEvidence.sort((a, b) => b.totalImpactScore - a.totalImpactScore);
    }
}
exports.ImpactScoringEngine = ImpactScoringEngine;
