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

let passed = 0;
let failed = 0;

function assert(testName: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  ✅ PASS  ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL  ${testName}${detail ? `\n          ${detail}` : ""}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// TEST 1 — Certification Contradiction: "Gold secured" AND "Gold at risk"
// Expected: FAIL (at least 1 CRITICAL violation)
// ---------------------------------------------------------------------------
console.log("\n═══════════════════════════════════════════════");
console.log("TEST 1 — Certification Contradiction");
console.log("Input: goldSecured=true AND goldAtRisk=true");
console.log("Expected: FAIL with CRITICAL violation");
console.log("═══════════════════════════════════════════════");
{
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
  assert("report.passed === false", !report.passed, `passed=${report.passed}`);
  assert(
    "CRITICAL violation exists",
    report.violations.some(v => v.severity === "CRITICAL"),
    `violations=${JSON.stringify(report.violations.map(v => v.code))}`
  );
  assert(
    "RULE_1_CERTIFICATION_CONTRADICTION fired",
    report.violations.some(v => v.code === "RULE_1_CERTIFICATION_CONTRADICTION"),
    `violations=${JSON.stringify(report.violations.map(v => v.code))}`
  );
  assert(
    "confidence reduced significantly",
    report.confidence <= 0.6,
    `confidence=${report.confidence}`
  );
  console.log(`  → Confidence: ${report.confidence.toFixed(2)}`);
}

// ---------------------------------------------------------------------------
// TEST 2 — Risk Points Contradiction: riskPoints===0 AND brief has risks
// Expected: FAIL with HIGH violation
// ---------------------------------------------------------------------------
console.log("\n═══════════════════════════════════════════════");
console.log("TEST 2 — Risk Points Contradiction");
console.log("Input: riskPoints=0 AND executiveBrief.risks.length > 0");
console.log("Expected: FAIL with HIGH violation");
console.log("═══════════════════════════════════════════════");
{
  const payload: ExecutiveValidationPayload = {
    certification: {
      currentPoints: 50,
      securedPoints: 50,
      riskPoints: 0,           // engine says zero risk
      projectedPoints: 50,
      targetCertification: "Gold",
      missingPoints: 10,
      narrative: "On track for Gold.",
      highestRiskCredits: [],
    },
    executiveBrief: {
      risks: ["EDA C1 evidence rejected", "WC C2 not uploaded"],  // brief contradicts
    },
  };

  const report = validator.validate(payload);
  assert("report.passed === false", !report.passed, `passed=${report.passed}`);
  assert(
    "RULE_2_RISK_POINTS_CONTRADICTION fired",
    report.violations.some(v => v.code === "RULE_2_RISK_POINTS_CONTRADICTION"),
    `violations=${JSON.stringify(report.violations.map(v => v.code))}`
  );
  assert(
    "violation severity is HIGH",
    report.violations.some(v => v.code === "RULE_2_RISK_POINTS_CONTRADICTION" && v.severity === "HIGH"),
  );
  console.log(`  → Confidence: ${report.confidence.toFixed(2)}`);
}

// ---------------------------------------------------------------------------
// TEST 3 — Submission Contradiction: submissionReady AND blockedCredits > 0
// Expected: FAIL with HIGH violation
// ---------------------------------------------------------------------------
console.log("\n═══════════════════════════════════════════════");
console.log("TEST 3 — Submission Contradiction");
console.log("Input: submissionReady=true AND blockedCredits=3");
console.log("Expected: FAIL with HIGH violation");
console.log("═══════════════════════════════════════════════");
{
  const payload: ExecutiveValidationPayload = {
    readiness: { submissionReady: true },
    risk: { blockedCredits: 3 },
  };

  const report = validator.validate(payload);
  assert("report.passed === false", !report.passed, `passed=${report.passed}`);
  assert(
    "RULE_3_SUBMISSION_CONTRADICTION fired",
    report.violations.some(v => v.code === "RULE_3_SUBMISSION_CONTRADICTION"),
    `violations=${JSON.stringify(report.violations.map(v => v.code))}`
  );
  assert(
    "violation severity is HIGH",
    report.violations.some(v => v.code === "RULE_3_SUBMISSION_CONTRADICTION" && v.severity === "HIGH"),
  );
  console.log(`  → Confidence: ${report.confidence.toFixed(2)}`);
}

// ---------------------------------------------------------------------------
// TEST 4 — Evidence Contradiction: missingDocuments===0 AND missingCredits > 0
// Expected: FAIL with MEDIUM violation
// ---------------------------------------------------------------------------
console.log("\n═══════════════════════════════════════════════");
console.log("TEST 4 — Evidence Contradiction");
console.log("Input: missingDocuments=0 AND missingCredits=4");
console.log("Expected: FAIL with MEDIUM violation");
console.log("═══════════════════════════════════════════════");
{
  const payload: ExecutiveValidationPayload = {
    evidence: {
      missingDocuments: 0,   // document-level says zero
      missingCredits: 4,     // credit-level says 4 credits need docs
    },
  };

  const report = validator.validate(payload);
  assert("report.passed === false", !report.passed, `passed=${report.passed}`);
  assert(
    "RULE_4_EVIDENCE_CONTRADICTION fired",
    report.violations.some(v => v.code === "RULE_4_EVIDENCE_CONTRADICTION"),
    `violations=${JSON.stringify(report.violations.map(v => v.code))}`
  );
  assert(
    "violation severity is MEDIUM",
    report.violations.some(v => v.code === "RULE_4_EVIDENCE_CONTRADICTION" && v.severity === "MEDIUM"),
  );
  console.log(`  → Confidence: ${report.confidence.toFixed(2)}`);
}

// ---------------------------------------------------------------------------
// TEST 5 — Valid Project State (no contradictions)
// Expected: PASS
// ---------------------------------------------------------------------------
console.log("\n═══════════════════════════════════════════════");
console.log("TEST 5 — Valid Project State");
console.log("Input: internally consistent data");
console.log("Expected: PASS");
console.log("═══════════════════════════════════════════════");
{
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
      goldSecured: false,     // not yet secured → consistent with riskPoints > 0
      goldAtRisk: true,
    },
    risk: {
      goldAtRisk: true,       // consistent with certification engine
      blockedCredits: 0,
    },
    readiness: {
      submissionReady: false, // consistent: no blocked credits but we still have missing docs
    },
    evidence: {
      missingDocuments: 6,    // non-zero → consistent with missingCredits > 0
      missingCredits: 2,
    },
    credits: [
      { credit_code: "EDA C1", complete: false, rejectedDocuments: 0 },
      { credit_code: "EE C1",  complete: false, rejectedDocuments: 0 },
    ],
    workload: {
      noConstraint: true,     // consistent: overloadedUsers is empty
      overloadedUsers: [],
    },
    executiveBrief: {
      risks: ["3 points at risk from EE C1"],  // consistent with riskPoints=3
    },
  };

  const report = validator.validate(payload);
  assert("report.passed === true", report.passed, `violations=${JSON.stringify(report.violations.map(v => v.code))}`);
  assert("no violations", report.violations.length === 0, `violations=${JSON.stringify(report.violations.map(v => v.code))}`);
  assert("confidence = 1.0", report.confidence === 1.0, `confidence=${report.confidence}`);
  console.log(`  → Confidence: ${report.confidence.toFixed(2)}`);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("\n════════════════════════════════════════════════");
console.log(`UAT SUMMARY: ${passed} passed | ${failed} failed`);
if (failed === 0) {
  console.log("✅ ALL TESTS PASSED — ExecutiveConsistencyValidator certified");
} else {
  console.log("❌ FAILURES DETECTED — Fix violations before deploying");
}
console.log("════════════════════════════════════════════════\n");

if (failed > 0) process.exit(1);
