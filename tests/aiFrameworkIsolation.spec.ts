import { test, expect } from "@playwright/test";
import { AiGovernanceBoundary } from "../lib/ai/aiGovernanceBoundary";

test.describe("AI Framework Isolation Validation", () => {
  test("should block GI V2 recommendations for GI V1 projects", () => {
    expect(() => {
      AiGovernanceBoundary.validateFrameworkAlignment("GI_V2", "GI_V1");
    }).toThrow(/FRAMEWORK_ISOLATION_VIOLATION/);
  });

  test("should block GI V1 recommendations for GI V2 projects", () => {
    expect(() => {
      AiGovernanceBoundary.validateFrameworkAlignment("GI_V1", "GI_V2");
    }).toThrow(/FRAMEWORK_ISOLATION_VIOLATION/);
  });

  test("should allow aligned framework recommendations", () => {
    const result = AiGovernanceBoundary.validateFrameworkAlignment("GI_V2", "GI_V2");
    expect(result).toBe(true);
  });
});
