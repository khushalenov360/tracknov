import { type DependencyNode, resolveDependenciesRecursively } from "./dependencyResolver";
import { generateReconciliationPlan } from "./reconciliationPlanner";

export interface GovernanceImpactResult {
  impactedExports: string[];
  impactedCredits: string[];
  impactedSnapshots: string[];
  impactedCertifications: string[];
  requiredReconciliationEvents: string[];
  downgradeRequired: boolean;
}

/**
 * Calculates downstream governance impact blast radius prior to committing workflow mutations.
 * Maps L5/L6 mutation propagation through documents -> credits -> certification -> export.
 */
export function calculateGovernanceImpactBlastRadius(
  targetMutationNodeId: string,
  fullGraphNodes: DependencyNode[],
): GovernanceImpactResult {
  const rootNode = fullGraphNodes.find((n) => n.id === targetMutationNodeId);
  if (!rootNode) {
    return {
      downgradeRequired: false,
      impactedCertifications: [],
      impactedCredits: [],
      impactedExports: [],
      impactedSnapshots: [],
      requiredReconciliationEvents: [],
    };
  }

  // Traversal enforces cycle detection, linear serialization, and tenant isolation
  const impactedNodes = resolveDependenciesRecursively(rootNode, fullGraphNodes);

  // Extract grouped impacted identifiers deterministically sorted
  const impactedExports = impactedNodes
    .filter((n) => n.type === "export")
    .map((n) => n.id)
    .sort();

  const impactedCredits = impactedNodes
    .filter((n) => n.type === "credit")
    .map((n) => n.id)
    .sort();

  const impactedCertifications = impactedNodes
    .filter((n) => n.type === "certification")
    .map((n) => n.id)
    .sort();

  // Any override or replay correction triggers snapshot marking
  const impactedSnapshots = impactedNodes
    .filter((n) => n.type === "override" || n.type === "replay_correction")
    .map((n) => n.id)
    .sort();

  // Generate actionable reconciliation pipeline
  const plans = generateReconciliationPlan(impactedNodes);
  const requiredReconciliationEvents = plans.map((p) => p.eventId);

  // Assert if a certification downgrade is strictly required
  const downgradeRequired = impactedCertifications.length > 0 || impactedExports.length > 0;

  return {
    downgradeRequired,
    impactedCertifications,
    impactedCredits,
    impactedExports,
    impactedSnapshots,
    requiredReconciliationEvents,
  };
}
