import { expect, test } from "@playwright/test";
import { CURRENT_REPLAY_CONTRACT } from "@tracknov/harita-engine/governance/replayContract";

test.describe("Layer 2 — Replay Mutation Protection Guard", () => {
  test("runtime mutation side-effects are disabled by design", () => {
    expect(CURRENT_REPLAY_CONTRACT.sideEffectMode).toBe("disabled");
  });
});
