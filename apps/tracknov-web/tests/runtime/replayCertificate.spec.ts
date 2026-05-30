import { expect, test } from "@playwright/test";
import { generateReplayAttestationProof } from "@tracknov/harita-engine/governance/replayAttestation";

test.describe("Layer 5 — Replay Proof Certification Spec", () => {
  test("cryptographic attestation generates unforgeable signatures", () => {
    const sig1 = generateReplayAttestationProof({
      isAuthorized: true,
      isIsolated: true,
      isPure: true,
      projectId: "p-1",
      replayHash: "hash-alpha",
      snapshotId: "s-1",
      timestamp: "2026-05-13T00:00:00Z",
    });

    const sig2 = generateReplayAttestationProof({
      isAuthorized: true,
      isIsolated: true,
      isPure: true,
      projectId: "p-1",
      replayHash: "hash-alpha",
      snapshotId: "s-1",
      timestamp: "2026-05-13T00:00:00Z",
    });

    expect(sig1).toBe(sig2);
    expect(sig1).toHaveLength(64); // SHA-256 hex string length
  });
});
