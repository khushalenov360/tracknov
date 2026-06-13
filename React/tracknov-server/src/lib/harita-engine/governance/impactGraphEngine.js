"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateGovernanceImpactBlastRadius = calculateGovernanceImpactBlastRadius;
const dependencyResolver_1 = require("./dependencyResolver");
const reconciliationPlanner_1 = require("./reconciliationPlanner");
/**
 * Calculates downstream governance impact blast radius prior to committing workflow mutations.
 * Maps L5/L6 mutation propagation through documents -> credits -> certification -> export.
 */
function calculateGovernanceImpactBlastRadius(targetMutationNodeId, fullGraphNodes) {
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
    const impactedNodes = (0, dependencyResolver_1.resolveDependenciesRecursively)(rootNode, fullGraphNodes);
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
    const plans = (0, reconciliationPlanner_1.generateReconciliationPlan)(impactedNodes);
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
