import { expect, test } from "@playwright/test";
import { calculateGovernanceImpactBlastRadius } from "@tracknov/harita-engine/governance/impactGraphEngine";
import { type DependencyNode } from "@tracknov/harita-engine/governance/dependencyResolver";

test.describe("Layer 4 — Override Blast Radius Assessment", () => {
  const nodes: DependencyNode[] = [
    { id: "ovr-1", type: "override" },
    { id: "credit-2", parentId: "ovr-1", type: "credit" },
  ];

  test("override propagation ranks repair sequences with maximum priority", () => {
    const res = calculateGovernanceImpactBlastRadius("ovr-1", nodes);
    expect(res.impactedSnapshots).toEqual(["ovr-1"]);
    expect(res.requiredReconciliationEvents[0]).toBe("plan-ovr-ovr-1"); // Priority 0 comes first
  });

  test("cycle detection gracefully terminates circular hierarchies", () => {
    const cyclicNodes: DependencyNode[] = [
      { id: "c-1", type: "credit" },
      { id: "c-2", parentId: "c-1", type: "credit" },
    ];
    // Form the cycle
    cyclicNodes[0].parentId = "c-2";

    const res = calculateGovernanceImpactBlastRadius("c-1", cyclicNodes);
    expect(res.impactedCredits).toContain("c-1");
  });
});
