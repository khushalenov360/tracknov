/**
 * Tracknov Live Ingestion Accuracy Benchmark - HVAC Specification Parsing
 * Validates specifications matching and canonical unit alignments against > 95% target.
 */

import { SpecificationCanonicalizer, UnitNormalizationEngine } from "../lib/harita-engine/extraction-feedback";

export function runHvacBenchmark(): { name: string; passed: boolean; score: number; target: number } {
  console.log("[BENCHMARK] Executing HVAC Specification Parsing Quality Test...");

  const testCases = [
    { param: "COP", raw: "5.8 COP", expected: "5.8 COP" },
    { param: "COP", raw: "5.8cop", expected: "5.8 COP" },
    { param: "EFFICIENCY", raw: "COP of 6.2", expected: "6.2 COP" },
    { param: "LPD", raw: "0.85 W/sq.ft", expected: "0.85 W/sq.ft" },
    { param: "LIGHTING", raw: "0.75 w/sqft", expected: "0.75 W/sq.ft" },
    { param: "FLOW", raw: "450 gpm", expected: "450 gpm" },
    { param: "FLOW_RATE", raw: "180 gpm", expected: "180 gpm" },
  ];

  let matchesCount = 0;
  for (const tc of testCases) {
    const canonical = SpecificationCanonicalizer.canonicalizeSpec(tc.param, tc.raw);
    const cleanUnit = UnitNormalizationEngine.normalizeUnit(canonical.canonicalValue.split(" ").pop() || "");
    const cleanExpectedUnit = tc.expected.split(" ").pop() || "";

    if (canonical.canonicalValue.includes(tc.expected.split(" ")[0]) && cleanUnit === cleanExpectedUnit) {
      matchesCount++;
    }
  }

  const accuracy = matchesCount / testCases.length;
  const target = 0.95;
  const passed = accuracy >= target;

  console.log(`- HVAC Specification Parsing Accuracy: ${(accuracy * 100).toFixed(2)}% (Target: ${(target * 100).toFixed(0)}%) - ${passed ? "PASSED" : "FAILED"}`);

  return {
    name: "HVAC Specification Accuracy",
    passed,
    score: accuracy,
    target
  };
}
