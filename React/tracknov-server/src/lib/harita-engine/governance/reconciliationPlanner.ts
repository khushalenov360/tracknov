import { type DependencyNode } from "./dependencyResolver";

export interface ReconciliationEventPlan {
  eventId: string;
  targetEntityType: string;
  targetEntityId: string;
  actionRequired: "recalculate_score" | "revoke_certification" | "invalidate_export" | "snapshot_repair";
  plannedPriority: number;
}

/**
 * Plans automated downstream reconciliation sequences triggered by L5 overrides or audit replay corrections.
 */
export function generateReconciliationPlan(impactedNodes: DependencyNode[]): ReconciliationEventPlan[] {
  const plans: ReconciliationEventPlan[] = [];

  for (const node of impactedNodes) {
    if (node.type === "credit") {
      plans.push({
        actionRequired: "recalculate_score",
        eventId: `plan-credit-${node.id}`,
        plannedPriority: 1,
        targetEntityId: node.id,
        targetEntityType: "credit",
      });
    } else if (node.type === "certification") {
      plans.push({
        actionRequired: "revoke_certification",
        eventId: `plan-cert-${node.id}`,
        plannedPriority: 2,
        targetEntityId: node.id,
        targetEntityType: "certification",
      });
    } else if (node.type === "export") {
      plans.push({
        actionRequired: "invalidate_export",
        eventId: `plan-exp-${node.id}`,
        plannedPriority: 3,
        targetEntityId: node.id,
        targetEntityType: "export",
      });
    } else if (node.type === "override") {
      plans.push({
        actionRequired: "snapshot_repair",
        eventId: `plan-ovr-${node.id}`,
        plannedPriority: 0, // Highest precedence execution
        targetEntityId: node.id,
        targetEntityType: "override",
      });
    }
  }

  // Deterministically sort the reconciliation events by priority, then eventId
  plans.sort((a, b) => {
    if (a.plannedPriority !== b.plannedPriority) {
      return a.plannedPriority - b.plannedPriority;
    }
    return a.eventId.localeCompare(b.eventId);
  });

  return plans;
}
