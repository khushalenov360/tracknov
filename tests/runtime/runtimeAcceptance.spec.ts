import { expect, test } from "@playwright/test";
import {
  assertRuntimeTransition,
  canTransitionRuntimeState,
  getAllowedRuntimeTransitions,
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
});
