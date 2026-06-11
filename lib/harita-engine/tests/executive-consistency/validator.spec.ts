// ============================================================
// UAT: Executive Consistency Validator
// Section 13 — Required Tests
//
// Run with:  npx tsx src/tests/executive-consistency/validator.spec.ts
// ============================================================

import {
  ExecutiveConsistencyValidator,
} from "../../intelligence/executive/executive-consistency-validator";
import type { ExecutiveValidationPayload } from "../../intelligence/executive/executive-consistency-validator";

const validator = new ExecutiveConsistencyValidator();

import { describe, it, expect } from 'vitest';

describe('Executive Consistency Validator', () => {
  it('TEST 1 — Certification Contradiction', () => {
    const payload: ExecutiveValidationPayload = {
      certification: {
        currentPoints: 65,
        securedPoints: 65,
        riskPoints: 5,
        projectedPoints: 70,
        targetCertification: "Platinum",
        missingPoints: 15,
        narrative: "Gold is already secured.\n\nHowever:\n5 points remain at risk.\n\nIf these risks materialize,\nGold becomes unattainable.",
        highestRiskCredits: ["EDA C1"],
        goldSecured: true,
        goldAtRisk: true,
      },
      risk: { goldAtRisk: true, blockedCredits: 2 },
    };

    const report = validator.validate(payload);
    expect(report.passed).toBe(false);
    expect(report.violations.some(v => v.severity === "CRITICAL")).toBe(true);
    expect(report.violations.some(v => v.code === "RULE_1_CERTIFICATION_CONTRADICTION")).toBe(true);
    expect(report.confidence).toBeLessThanOrEqual(0.6);
  });

  it('TEST 2 — Risk Points Contradiction', () => {
    const payload: ExecutiveValidationPayload = {
      certification: {
        currentPoints: 50,
        securedPoints: 50,
        riskPoints: 0,
        projectedPoints: 50,
        targetCertification: "Gold",
        missingPoints: 10,
        narrative: "On track for Gold.",
        highestRiskCredits: [],
      },
      executiveBrief: {
        risks: ["EDA C1 evidence rejected", "WC C2 not uploaded"],
      },
    };

    const report = validator.validate(payload);
    expect(report.passed).toBe(false);
    expect(report.violations.some(v => v.code === "RULE_2_RISK_POINTS_CONTRADICTION")).toBe(true);
    expect(report.violations.some(v => v.code === "RULE_2_RISK_POINTS_CONTRADICTION" && v.severity === "HIGH")).toBe(true);
  });

  it('TEST 3 — Submission Contradiction', () => {
    const payload: ExecutiveValidationPayload = {
      readiness: { submissionReady: true },
      risk: { blockedCredits: 3 },
    };

    const report = validator.validate(payload);
    expect(report.passed).toBe(false);
    expect(report.violations.some(v => v.code === "RULE_3_SUBMISSION_CONTRADICTION")).toBe(true);
    expect(report.violations.some(v => v.code === "RULE_3_SUBMISSION_CONTRADICTION" && v.severity === "HIGH")).toBe(true);
  });

  it('TEST 4 — Evidence Contradiction', () => {
    const payload: ExecutiveValidationPayload = {
      evidence: {
        missingDocuments: 0,
        missingCredits: 4,
      },
    };

    const report = validator.validate(payload);
    expect(report.passed).toBe(false);
    expect(report.violations.some(v => v.code === "RULE_4_EVIDENCE_CONTRADICTION")).toBe(true);
    expect(report.violations.some(v => v.code === "RULE_4_EVIDENCE_CONTRADICTION" && v.severity === "MEDIUM")).toBe(true);
  });

  it('TEST 5 — Valid Project State', () => {
    const payload: ExecutiveValidationPayload = {
      certification: {
        currentPoints: 45,
        securedPoints: 45,
        riskPoints: 3,
        projectedPoints: 48,
        targetCertification: "Gold",
        missingPoints: 15,
        narrative: "Targeting Gold.\n\n3 points remain at risk.",
        highestRiskCredits: ["EE C1"],
        goldSecured: false,
        goldAtRisk: true,
      },
      risk: {
        goldAtRisk: true,
        blockedCredits: 0,
      },
      readiness: {
        submissionReady: false,
      },
      evidence: {
        missingDocuments: 6,
        missingCredits: 2,
      },
      credits: [
        { credit_code: "EDA C1", complete: false, rejectedDocuments: 0 },
        { credit_code: "EE C1",  complete: false, rejectedDocuments: 0 },
      ],
      workload: {
        noConstraint: true,
        overloadedUsers: [],
      },
      executiveBrief: {
        risks: ["3 points at risk from EE C1"],
      },
    };

    const report = validator.validate(payload);
    expect(report.passed).toBe(true);
    expect(report.violations.length).toBe(0);
    expect(report.confidence).toBe(1.0);
  });
});
