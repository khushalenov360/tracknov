import { expect, test } from "@playwright/test";
import {
  assertRuntimeTransition,
  canTransitionRuntimeState,
  getAllowedRuntimeTransitions,
  type RuntimeWorkflowState,
} from "@/core/runtime/stateMachine";

test.describe("runtime acceptance matrix", () => {
  test("deterministic transition matrix allows only explicit transitions", () => {
    expect(canTransitionRuntimeState("DRAFT", "READY")).toBe(true);
    expect(canTransitionRuntimeState("READY", "SUBMITTED")).toBe(true);
    expect(canTransitionRuntimeState("DRAFT", "APPROVED")).toBe(false);
    expect(canTransitionRuntimeState("APPROVED", "DRAFT")).toBe(false);
  });

  test("illegal transitions throw deterministic error", () => {
    expect(() => assertRuntimeTransition("DRAFT", "APPROVED")).toThrow(
      "Illegal workflow transition: DRAFT -> APPROVED",
    );
  });

  test("rejection branch supports replay-safe lifecycle", () => {
    const allowedFromRejected = getAllowedRuntimeTransitions("REJECTED");
    expect(allowedFromRejected).toContain("RESUBMITTED");
    expect(allowedFromRejected).toContain("ELIMINATED");
  });

  test("terminal states do not allow mutable forward transitions", () => {
    expect(getAllowedRuntimeTransitions("APPROVED")).toEqual([]);
    expect(getAllowedRuntimeTransitions("ELIMINATED")).toEqual([]);
  });

  test("all allowed transitions are explicit and deterministic", () => {
    const matrix: Record<RuntimeWorkflowState, RuntimeWorkflowState[]> = {
      DRAFT: ["READY"],
      READY: ["SUBMITTED"],
      SUBMITTED: ["UNDER_REVIEW", "REJECTED", "CLARIFICATION"],
      UNDER_REVIEW: ["APPROVED", "REJECTED", "CLARIFICATION"],
      CLARIFICATION: ["RESUBMITTED", "ELIMINATED"],
      RESUBMITTED: ["UNDER_REVIEW", "REJECTED", "CLARIFICATION"],
      APPROVED: [],
      REJECTED: ["RESUBMITTED", "ELIMINATED"],
      ELIMINATED: [],
    };

    (Object.keys(matrix) as RuntimeWorkflowState[]).forEach((fromState) => {
      expect(getAllowedRuntimeTransitions(fromState)).toEqual(matrix[fromState]);
    });
  });

  test("approval path stays replay-safe from draft to approved", () => {
    const legalPath: RuntimeWorkflowState[] = ["DRAFT", "READY", "SUBMITTED", "UNDER_REVIEW", "APPROVED"];
    for (let i = 0; i < legalPath.length - 1; i += 1) {
      expect(() => assertRuntimeTransition(legalPath[i], legalPath[i + 1])).not.toThrow();
    }
  });

  test("second-rejection elimination path blocks resurrection", () => {
    expect(canTransitionRuntimeState("REJECTED", "ELIMINATED")).toBe(true);
    expect(canTransitionRuntimeState("ELIMINATED", "RESUBMITTED")).toBe(false);
    expect(() => assertRuntimeTransition("ELIMINATED", "RESUBMITTED")).toThrow(
      "Illegal workflow transition: ELIMINATED -> RESUBMITTED",
    );
  });
});
