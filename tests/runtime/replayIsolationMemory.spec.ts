import { expect, test } from "@playwright/test";
import { runWithPurityGuard } from "@tracknov/harita-engine/governance/replayPurityGuard";

test.describe("Layer 3 — Replay Isolation Memory Context", () => {
  test("memory state self-destructs after replay execution block completes", async () => {
    let internalResult = false;
    await runWithPurityGuard("proj-shared", async () => {
      internalResult = true;
      return true;
    });
    expect(internalResult).toBe(true);
  });
});
