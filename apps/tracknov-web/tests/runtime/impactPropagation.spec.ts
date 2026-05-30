import { expect, test } from "@playwright/test";
import { calculateGovernanceImpactBlastRadius } from "@/lib/governance/impactGraphEngine";
import { type DependencyNode } from "@/lib/governance/dependencyResolver";

test.describe("Layer 4 — Governance Impact Propagation", () => {
  const nodes: DependencyNode[] = [
    { id: "doc-1", type: "document" },
    { id: "credit-1", parentId: "doc-1", type: "credit" },
    { id: "cert-1", parentId: "credit-1", type: "certification" },
    { id: "exp-1", parentId: "cert-1", type: "export" },
  ];

  test("recursive traversal identifies all downstream elements linearly", () => {
    const res = calculateGovernanceImpactBlastRadius("doc-1", nodes);
    expect(res.impactedCredits).toEqual(["credit-1"]);
    expect(res.impactedCertifications).toEqual(["cert-1"]);
    expect(res.impactedExports).toEqual(["exp-1"]);
    expect(res.downgradeRequired).toBe(true);
    expect(res.requiredReconciliationEvents).toContain("plan-credit-credit-1");
  });

  test("non-existent roots return empty blast radius safely", () => {
    const res = calculateGovernanceImpactBlastRadius("invalid-id", nodes);
    expect(res.downgradeRequired).toBe(false);
    expect(res.impactedCredits).toEqual([]);
  });
});
