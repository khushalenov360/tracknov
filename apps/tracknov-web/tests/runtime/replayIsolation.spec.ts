import { expect, test } from "@playwright/test";
import { CURRENT_REPLAY_CONTRACT } from "@/lib/governance/replayContract";

test.describe("Layer 2 — Replay Isolation Boundaries", () => {
  test("cross-project visibility is strictly forbidden during replay", () => {
    expect(CURRENT_REPLAY_CONTRACT.crossProjectVisibility).toBe(false);
    expect(CURRENT_REPLAY_CONTRACT.replayIsolationMode).toBe("strict");
  });
});
