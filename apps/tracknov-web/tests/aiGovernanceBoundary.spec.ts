import { test, expect } from "@playwright/test";
import { AiGovernanceBoundary } from "../lib/ai/aiGovernanceBoundary";

test.describe("AI Governance Boundary Validation", () => {
  test("should block AI attempts to approve credits", () => {
    expect(() => {
      AiGovernanceBoundary.validateRecommendation("APPROVE_CREDIT", { creditId: "test-credit" });
    }).toThrow(/GOVERNANCE_VIOLATION/);
  });

  test("should block AI attempts to reject credits", () => {
    expect(() => {
      AiGovernanceBoundary.validateRecommendation("REJECT_CREDIT", { creditId: "test-credit" });
    }).toThrow(/GOVERNANCE_VIOLATION/);
  });

  test("should block AI attempts to mutate authoritative state", () => {
    expect(() => {
      AiGovernanceBoundary.validateRecommendation("MUTATE_STATE", { table: "projects", data: {} });
    }).toThrow(/GOVERNANCE_VIOLATION/);
  });

  test("should block AI attempts to bypass validation via payload flags", () => {
    expect(() => {
      AiGovernanceBoundary.validateRecommendation("GENERATE_ADVICE", { skipValidation: true });
    }).toThrow(/GOVERNANCE_VIOLATION/);
  });

  test("should block AI attempts to set authoritative flags", () => {
    expect(() => {
      AiGovernanceBoundary.validateRecommendation("GENERATE_ADVICE", { authoritative: true });
    }).toThrow(/GOVERNANCE_VIOLATION/);
  });

  test("should allow advisory-only recommendations", () => {
    const result = AiGovernanceBoundary.validateRecommendation("DRAFT_CLARIFICATION", { content: "Please provide more info." });
    expect(result).toBe(true);
  });
});
