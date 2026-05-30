import { expect, test } from "@playwright/test";
import { CURRENT_REPLAY_CONTRACT, validateReplayContractSemantics } from "@/lib/governance/replayContract";

test.describe("Layer 2 — Replay Determinism Verification", () => {
  test("CURRENT_REPLAY_CONTRACT enforces strict determinism boundaries", () => {
    expect(CURRENT_REPLAY_CONTRACT.replayBoundary).toBe("snapshot_authoritative");
    expect(CURRENT_REPLAY_CONTRACT.sideEffectMode).toBe("disabled");
    expect(validateReplayContractSemantics(CURRENT_REPLAY_CONTRACT)).toBe(true);
  });

  test("invalid contract semantics are rejected deterministically", () => {
    expect(validateReplayContractSemantics({ ...CURRENT_REPLAY_CONTRACT, sideEffectMode: "enabled" as any })).toBe(false);
  });
});
