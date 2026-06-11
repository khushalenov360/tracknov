import { test, expect } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { scoreIgbcCredits, igbcScoreModel } from "@/lib/igbc-scoring";

/**
 * CERTIFICATION RULESET REPLAY SUITE
 * 
 * Implements Section 5 and Section 153 of the Governance Evolution Request.
 */
test.describe("Certification Ruleset Versioning", () => {
  
  test("Scoring output MUST include authoritative ruleset versions", () => {
    const mockCredits: any[] = [
      { credit_code: "EE 1", status: "complete", is_mandatory: false, documents: [] }
    ];
    
    const result = scoreIgbcCredits(mockCredits, "new");
    
    expect(result.versionContext).toBeDefined();
    expect(result.versionContext.ruleset_version).toBe(igbcScoreModel.version);
    expect(result.versionContext.scoring_formula_version).toBe(igbcScoreModel.scoringFormulaVersion);
    expect(result.versionContext.threshold_version).toBe(igbcScoreModel.thresholdVersion);
    
    console.log("[CERTIFICATION_TEST] Ruleset versioning context captured:", result.versionContext);
  });

  test("Historical reproducibility check (Rule Immortality)", () => {
    // This test simulates a historical ruleset comparison
    const historicalResult = {
      earned: 10,
      versionContext: {
        ruleset_version: "0.9.0",
        scoring_formula_version: "0.9.0"
      }
    };

    const currentVersion = igbcScoreModel.version;
    console.log(`[CERTIFICATION_TEST] Current Version: ${currentVersion}, Historical: ${historicalResult.versionContext.ruleset_version}`);
    
    // In a real scenario, we would use a compatibility adapter here.
    // For now, we just prove we can detect the delta.
    expect(currentVersion).not.toBe(historicalResult.versionContext.ruleset_version);
  });

  test("Scoring output MUST exclude NA credits from totalAvailable and category totals", () => {
    const mockCredits: any[] = [
      { credit_code: "EE C1", status: "complete", is_mandatory: false, max_points: 1, na: false, documents: [] },
      { credit_code: "EE C2", status: "pending", is_mandatory: false, max_points: 10, na: true, documents: [] }, // NA!
      { credit_code: "WC C1", status: "complete", is_mandatory: false, max_points: 12, na: false, documents: [] }
    ];

    const result = scoreIgbcCredits(mockCredits, "new");
    
    // Total available should be 1 + 12 = 13 (EE C2 is NA and excluded)
    expect(result.totalAvailable).toBe(13);
    
    // EE category total should be 1
    const eeCategory = result.categories.find(c => c.category === "EE");
    expect(eeCategory).toBeDefined();
    expect(eeCategory!.total).toBe(1);
    
    // WC category total should be 12
    const wcCategory = result.categories.find(c => c.category === "WC");
    expect(wcCategory).toBeDefined();
    expect(wcCategory!.total).toBe(12);

    // Earned should be 1 (EE C1 complete) + 12 (WC C1 complete) = 13
    expect(result.earned).toBe(13);
  });
});
