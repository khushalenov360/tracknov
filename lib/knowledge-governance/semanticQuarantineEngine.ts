/**
 * Tracknov Knowledge Governance - Semantic Quarantine Engine
 * Isolates noisy or poisoned learning outputs so they do not contaminate global model layers.
 */

export type QuarantinedKnowledgeEvent = {
  id: string;
  reason: string;
  affectedModules: string[];
  contaminationRisk: number; // 0.0 to 1.0
  quarantineStatus: "QUARANTINED" | "REVIEWED" | "DISMISSED";
  quarantinedAt: string;
};

export class SemanticQuarantineEngine {
  private static quarantines: Map<string, QuarantinedKnowledgeEvent> = new Map();

  /**
   * Quarantines a suspicious learning parameter or override sequence.
   */
  public static quarantine(
    reason: string,
    affectedModules: string[],
    contaminationRisk: number
  ): QuarantinedKnowledgeEvent {
    const id = `q-${Math.random().toString(36).substr(2, 9)}`;
    const event: QuarantinedKnowledgeEvent = {
      id,
      reason,
      affectedModules,
      contaminationRisk,
      quarantineStatus: "QUARANTINED",
      quarantinedAt: new Date().toISOString()
    };
    this.quarantines.set(id, event);
    return event;
  }

  public static listQuarantined(): QuarantinedKnowledgeEvent[] {
    return Array.from(this.quarantines.values());
  }

  public static updateStatus(id: string, status: QuarantinedKnowledgeEvent["quarantineStatus"]): boolean {
    const target = this.quarantines.get(id);
    if (!target) return false;
    target.quarantineStatus = status;
    return true;
  }

  /**
   * Asserts whether a given module is safe from quarantined entries.
   */
  public static isModuleContaminated(moduleName: string): boolean {
    return Array.from(this.quarantines.values()).some(
      q => q.quarantineStatus === "QUARANTINED" && q.affectedModules.includes(moduleName) && q.contaminationRisk > 0.8
    );
  }
}
