// ============================================================
// ExecutiveConsistencyValidator
//
// Every executive response is gated through this validator.
// Six mandatory contradiction rules are enforced.
// A confidence score is reduced per-violation.
// If CRITICAL violations are found, the response is suppressed.
// ============================================================

import {
  ConsistencyReport,
  ConsistencyViolation,
  ViolationSeverity,
} from "./types/consistency-types";
import type { CertificationGap } from "../certification/certification-gap-engine";
import type { ContributorWorkload } from "../workload/workload-intelligence-engine";
import type { EvidenceGap } from "../evidence/portfolio-evidence-engine";

// ---------------------------------------------------------------------------
// Payload fed into the validator
// ---------------------------------------------------------------------------

export interface ExecutiveValidationPayload {
  /** Result from CertificationGapEngine */
  certification?: CertificationGap & {
    /** True when the current certification level is explicitly secured */
    goldSecured?: boolean;
    /** True when the certification level is at risk */
    goldAtRisk?: boolean;
  };

  /** Summarised risk state derived from RiskReasoner or project context */
  risk?: {
    goldAtRisk?: boolean;
    /** Number of credits that are fully blocked */
    blockedCredits?: number;
  };

  /** Readiness state */
  readiness?: {
    submissionReady?: boolean;
  };

  /** Portfolio evidence result */
  evidence?: {
    /** Total missing-document count across all credits */
    missingDocuments?: number;
    /** Credits that still have at least one missing document */
    missingCredits?: number;
    /** Raw evidence gaps for per-credit contradiction checks */
    gaps?: EvidenceGap[];
  };

  /** Flattened credit completion state for per-credit contradiction check */
  credits?: Array<{
    credit_code: string;
    complete: boolean;
    rejectedDocuments?: number;
  }>;

  /** Workload summary */
  workload?: {
    noConstraint?: boolean;
    overloadedUsers?: ContributorWorkload[];
  };

  /** The brief that will be shown to the user */
  executiveBrief?: {
    risks?: string[];
  };
}

// ---------------------------------------------------------------------------
// Severity → confidence-reduction mapping
// ---------------------------------------------------------------------------

const SEVERITY_DEDUCTION: Record<ViolationSeverity, number> = {
  LOW: 0.05,
  MEDIUM: 0.10,
  HIGH: 0.20,
  CRITICAL: 0.40,
};

// ---------------------------------------------------------------------------
// Main Validator
// ---------------------------------------------------------------------------

export class ExecutiveConsistencyValidator {
  /**
   * Validates an ExecutiveValidationPayload against all six mandatory rules.
   * Returns a ConsistencyReport with confidence, violations, and pass/fail.
   */
  public validate(input: ExecutiveValidationPayload): ConsistencyReport {
    const violations: ConsistencyViolation[] = [];

    // -----------------------------------------------------------------------
    // RULE 1 — Certification Contradiction
    // INVALID: "Gold secured" AND "Gold at risk"
    // Severity: CRITICAL
    // -----------------------------------------------------------------------
    const certGoldSecured =
      input.certification?.goldSecured === true ||
      (
        input.certification !== undefined &&
        input.certification.narrative?.toLowerCase().includes("gold is already secured")
      );

    const certGoldAtRisk =
      input.risk?.goldAtRisk === true ||
      (
        input.certification !== undefined &&
        input.certification.riskPoints > 0 &&
        input.certification.narrative?.toLowerCase().includes("gold becomes unattainable")
      );

    if (certGoldSecured && certGoldAtRisk) {
      violations.push({
        code: "RULE_1_CERTIFICATION_CONTRADICTION",
        severity: "CRITICAL",
        engineA: "CertificationGapEngine",
        engineB: "RiskReasoner",
        statementA: "Gold certification is secured.",
        statementB: "Gold certification is at risk.",
        explanation:
          "The certification engine reports Gold as secured while the risk engine reports it remains at risk. " +
          "These states are mutually exclusive. Data reconciliation is required.",
      });
    }

    // -----------------------------------------------------------------------
    // RULE 2 — Risk Points Contradiction
    // INVALID: riskPoints === 0 AND executiveBrief.risks.length > 0
    // Severity: HIGH
    // -----------------------------------------------------------------------
    const zeroRiskPoints =
      input.certification !== undefined && input.certification.riskPoints === 0;
    const briefHasRisks =
      Array.isArray(input.executiveBrief?.risks) &&
      input.executiveBrief!.risks!.length > 0;

    if (zeroRiskPoints && briefHasRisks) {
      violations.push({
        code: "RULE_2_RISK_POINTS_CONTRADICTION",
        severity: "HIGH",
        engineA: "CertificationGapEngine",
        engineB: "ExecutiveBriefPlanner",
        statementA: "Certification engine reports 0 points at risk.",
        statementB: `Executive brief contains ${input.executiveBrief!.risks!.length} listed risk(s).`,
        explanation:
          "The certification engine shows no points at risk, but the executive brief enumerates active risks. " +
          "The brief must be re-generated after risk data is reconciled.",
      });
    }

    // -----------------------------------------------------------------------
    // RULE 3 — Submission Contradiction
    // INVALID: submissionReady AND blockedCredits > 0
    // Severity: HIGH
    // -----------------------------------------------------------------------
    const submissionReady = input.readiness?.submissionReady === true;
    const hasBlockedCredits =
      typeof input.risk?.blockedCredits === "number" &&
      input.risk.blockedCredits > 0;

    if (submissionReady && hasBlockedCredits) {
      violations.push({
        code: "RULE_3_SUBMISSION_CONTRADICTION",
        severity: "HIGH",
        engineA: "SubmissionReadinessEngine",
        engineB: "RiskReasoner",
        statementA: "Submission is marked as ready.",
        statementB: `${input.risk!.blockedCredits} credit(s) are blocked.`,
        explanation:
          "A submission cannot be ready while one or more credits remain blocked. " +
          "Blocked credits must be resolved before submission readiness can be confirmed.",
      });
    }

    // -----------------------------------------------------------------------
    // RULE 4 — Evidence Contradiction
    // INVALID: missingDocuments === 0 AND missingCredits > 0
    // Severity: MEDIUM
    // -----------------------------------------------------------------------
    const noMissingDocs =
      typeof input.evidence?.missingDocuments === "number" &&
      input.evidence.missingDocuments === 0;
    const hasMissingCredits =
      typeof input.evidence?.missingCredits === "number" &&
      input.evidence.missingCredits > 0;

    if (noMissingDocs && hasMissingCredits) {
      violations.push({
        code: "RULE_4_EVIDENCE_CONTRADICTION",
        severity: "MEDIUM",
        engineA: "PortfolioEvidenceEngine (documents)",
        engineB: "PortfolioEvidenceEngine (credits)",
        statementA: "All documents are present (0 missing).",
        statementB: `${input.evidence!.missingCredits} credit(s) still have missing evidence.`,
        explanation:
          "The document-level count reports zero missing items, but the credit-level analysis " +
          "identifies credits with outstanding evidence. This inconsistency must be resolved.",
      });
    }

    // -----------------------------------------------------------------------
    // RULE 5 — Credit Completion Contradiction
    // INVALID: credit.complete AND credit.rejectedDocuments > 0
    // Severity: HIGH (per-credit)
    // -----------------------------------------------------------------------
    for (const credit of input.credits || []) {
      if (credit.complete && (credit.rejectedDocuments ?? 0) > 0) {
        violations.push({
          code: `RULE_5_CREDIT_COMPLETION_CONTRADICTION_${credit.credit_code}`,
          severity: "HIGH",
          engineA: "CreditCompletionTracker",
          engineB: "PortfolioEvidenceEngine",
          statementA: `${credit.credit_code} is marked as complete.`,
          statementB: `${credit.credit_code} has ${credit.rejectedDocuments} rejected document(s).`,
          explanation:
            `Credit ${credit.credit_code} cannot be complete while it holds rejected evidence. ` +
            "The completion flag must not be set until all documents are accepted.",
        });
      }
    }

    // -----------------------------------------------------------------------
    // RULE 6 — Resource Contradiction
    // INVALID: workload.noConstraint AND overloadedUsers.length > 0
    // Severity: MEDIUM
    // -----------------------------------------------------------------------
    const noConstraint = input.workload?.noConstraint === true;
    const overloadedCount = input.workload?.overloadedUsers?.length ?? 0;

    if (noConstraint && overloadedCount > 0) {
      violations.push({
        code: "RULE_6_RESOURCE_CONTRADICTION",
        severity: "MEDIUM",
        engineA: "WorkloadIntelligenceEngine (summary)",
        engineB: "WorkloadIntelligenceEngine (detail)",
        statementA: "No resource constraints exist.",
        statementB: `${overloadedCount} contributor(s) are overloaded.`,
        explanation:
          "The workload summary claims no resource constraints, but the detailed workload analysis " +
          "identifies overloaded contributors. The summary must be corrected.",
      });
    }

    // -----------------------------------------------------------------------
    // Compute confidence
    // -----------------------------------------------------------------------
    let confidence = 1.0;
    for (const v of violations) {
      confidence -= SEVERITY_DEDUCTION[v.severity];
    }
    confidence = Math.max(0, Math.min(1, confidence));

    const criticalCount = violations.filter(
      (v) => v.severity === "CRITICAL"
    ).length;

    return {
      passed: violations.length === 0,
      violations,
      confidence,
      // Expose critical count as a non-interface field for runtime callers
      ...(criticalCount > 0 ? { _criticalCount: criticalCount } : {}),
    };
  }

  /**
   * Returns the suppression message when the validator blocks a response.
   */
  public static suppressionMessage(report: ConsistencyReport): string {
    const criticalCodes = report.violations
      .filter((v) => v.severity === "CRITICAL")
      .map((v) => v.code)
      .join(", ");

    return (
      "I detected conflicting project intelligence signals while preparing this recommendation.\n\n" +
      "The project data currently contains contradictory states that require reconciliation before " +
      "I can provide a reliable executive recommendation.\n\n" +
      `Detected contradiction(s): ${criticalCodes}`
    );
  }
}

export const executiveConsistencyValidator = new ExecutiveConsistencyValidator();
