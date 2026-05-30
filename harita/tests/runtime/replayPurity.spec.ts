import { expect, test } from "@playwright/test";
import { computePureDerivedStateInMemory, type ReplayMemoryContext } from "@/lib/governance/derivedStateEngine";
import { assertSideEffectPermitted, ReplayPurityViolationError, runWithPurityGuard } from "@/lib/governance/replayPurityGuard";

test.describe("Layer 3 — Replay Purity & Side-Effect Guards", () => {
  test("in-memory state recomputation is side-effect free and memory scoped", () => {
    const mockCtx: ReplayMemoryContext = {
      inMemoryTables: {
        credits: [
          { points_awarded: 15, status: "APPROVED" },
          { points_awarded: 25, status: "AWARDED" },
          { credit_id: "CREDIT_MANDATORY_1", points_awarded: 0, status: "REJECTED" },
        ],
        documents: [],
        projects: {},
      },
      projectId: "proj-1",
      replayTimestamp: "2026-05-13T00:00:00Z",
    };

    const res = computePureDerivedStateInMemory(mockCtx);
    expect(res.awardedPoints).toBe(40);
    expect(res.mandatoryFailedCount).toBe(1);
    expect(res.computedCertificationState).toBe("BLOCKED");
    expect(res.isMemoryScopedOnly).toBe(true);
  });

  test("purity guard wrapper intercepts persistence operations", async () => {
    await runWithPurityGuard("proj-1", async () => {
      expect(() => assertSideEffectPermitted("broadcast_websocket")).toThrow(ReplayPurityViolationError);
      return true;
    });

    // Outside the guard, side effects are permitted if no context is active
    expect(() => assertSideEffectPermitted("normal_mutation")).not.toThrow();
  });
});
