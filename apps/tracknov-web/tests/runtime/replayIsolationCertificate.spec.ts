import { expect, test } from "@playwright/test";
import { generateReplayAttestationProof } from "@tracknov/harita-engine/governance/replayAttestation";

test.describe("Layer 5 — Replay Isolation Certificate Spec", () => {
  test("mismatching authorization scopes break attestation validity", () => {
    const validSig = generateReplayAttestationProof({
      isAuthorized: true,
      isIsolated: true,
      isPure: true,
      projectId: "p-target",
      replayHash: "hash-shared",
      snapshotId: "snap-1",
      timestamp: "2026-05-13T00:00:00Z",
    });

    const unauthorizedSig = generateReplayAttestationProof({
      isAuthorized: false,
      isIsolated: true,
      isPure: true,
      projectId: "p-target",
      replayHash: "hash-shared",
      snapshotId: "snap-1",
      timestamp: "2026-05-13T00:00:00Z",
    });

    expect(validSig).not.toBe(unauthorizedSig);
  });
});
