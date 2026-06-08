// ============================================================
// Decision Intelligence Types
// ============================================================

export interface DecisionOption {
  id: string;
  title: string;

  /**
   * Contribution to certification score gain (0–100).
   */
  certificationGain: number;

  /**
   * Expected improvement in readiness (0–100).
   */
  readinessGain: number;

  /**
   * Expected reduction in project risk (0–100).
   */
  riskReduction: number;

  /**
   * Effort required to execute (0–100; higher = harder).
   */
  effortRequired: number;

  /**
   * Computed ROI score.
   * roiScore = (certificationGain * 0.35) + (readinessGain * 0.30)
   *          + (riskReduction * 0.25) - (effortRequired * 0.10)
   */
  roiScore: number;

  /**
   * Optional supporting rationale.
   */
  rationale?: string;
}
