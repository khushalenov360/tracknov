/**
 * Tracknov Knowledge Governance - Semantic Contamination Scanner
 * Traces the downstream propagation risk of quarantined entries across active modules.
 */

export interface ContaminationRiskReport {
  propagationRisk: number; // 0.0 to 1.0
  activeModulesAffected: string[];
  blockTriggered: boolean;
}

export class SemanticContaminationScanner {
  /**
   * Scans dependency models and evaluates if high risk values contaminate retrievals.
   */
  public static scan(
    quarantineRisk: number,
    dependentModulesCount: number
  ): ContaminationRiskReport {
    const risk = quarantineRisk * (1.0 + dependentModulesCount * 0.1);
    const propagationRisk = Math.min(risk, 1.0);
    const blockTriggered = propagationRisk > 0.75;

    const activeModulesAffected: string[] = ["SemanticRetrievalEngine"];
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
