"use strict";
/**
 * Tracknov Knowledge Governance - Semantic Contamination Scanner
 * Traces the downstream propagation risk of quarantined entries across active modules.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticContaminationScanner = void 0;
class SemanticContaminationScanner {
    /**
     * Scans dependency models and evaluates if high risk values contaminate retrievals.
     */
    static scan(quarantineRisk, dependentModulesCount) {
        const risk = quarantineRisk * (1.0 + dependentModulesCount * 0.1);
        const propagationRisk = Math.min(risk, 1.0);
        const blockTriggered = propagationRisk > 0.75;
        const activeModulesAffected = ["SemanticRetrievalEngine"];
        if (dependentModulesCount > 1) {
            activeModulesAffected.push("FrameworkSemanticTagger");
        }
        if (dependentModulesCount > 2) {
            activeModulesAffected.push("ClarificationSemanticEngine");
        }
        return {
            propagationRisk,
            activeModulesAffected,
            blockTriggered
        };
    }
}
exports.SemanticContaminationScanner = SemanticContaminationScanner;
