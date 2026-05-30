/**
 * Tracknov Knowledge Governance - Semantic Decision Audit Trail
 * Traces exact reasoning for rank score overrides and confidence calibration adjustments.
 */

export interface AuditRecord {
  decisionId: string;
  module: string;
  originalScore: number;
  finalScore: number;
  rationale: string;
  timestamp: string;
}

export class SemanticDecisionAuditTrail {
  private static trail: AuditRecord[] = [];

  public static logDecision(
    module: string,
    originalScore: number,
    finalScore: number,
    rationale: string
  ): AuditRecord {
    const record: AuditRecord = {
      decisionId: `dec-${Math.random().toString(36).substr(2, 9)}`,
      module,
      originalScore,
      finalScore,
      rationale,
      timestamp: new Date().toISOString()
    };
    this.trail.push(record);
    return record;
  }

  public static getTrail(): AuditRecord[] {
    return this.trail;
  }
}
