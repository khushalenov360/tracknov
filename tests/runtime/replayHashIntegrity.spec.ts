import { expect, test } from "@playwright/test";
import { generateLineageHash } from "@tracknov/harita-engine/governance/hashSerializer";

test.describe("Layer 5 — Replay Hash Integrity Verification", () => {
  test("bitwise identical state structures yield perfectly matching lineage hashes", () => {
    const payloadA = {
      certificationState: { certified: true },
      dependencyGraph: {},
      derivedState: { scores: 45 },
      exportReferences: {},
      replayContractVersion: "v1.0-deterministic",
      workflowLineage: { id: "wf-1" },
    };

    const payloadB = {
      // Different order of properties but structurally identical
      workflowLineage: { id: "wf-1" },
      replayContractVersion: "v1.0-deterministic",
      exportReferences: {},
      derivedState: { scores: 45 },
      dependencyGraph: {},
      certificationState: { certified: true },
    };

    expect(generateLineageHash(payloadA)).toBe(generateLineageHash(payloadB));
  });
});
