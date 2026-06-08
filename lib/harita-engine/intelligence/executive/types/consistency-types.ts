// ============================================================
// Executive Consistency Validator — Shared Types
// ============================================================

export type ViolationSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ConsistencyViolation {
  /** Unique rule code, e.g. RULE_1_CERTIFICATION_CONTRADICTION */
  code: string;
  severity: ViolationSeverity;

  engineA: string;
  engineB: string;

  statementA: string;
  statementB: string;

  explanation: string;
}

export interface ConsistencyReport {
  passed: boolean;
  violations: ConsistencyViolation[];
  /** 0.0 – 1.0 */
  confidence: number;
}
