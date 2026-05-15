import { createAdminClient } from "@/lib/supabase/admin";
import { recomputeDerivedState } from "@/core/runtime/derivedStateEngine";
import { emitGovernanceEvent } from "./governanceObservabilityBus";
import { runInOperationalMode } from "./governanceMutationInterceptor";

/**
 * Enterprise Drift Daemon (Workstream 2).
 * Proactively scans for state desynchronization and executes derived-state convergence.
 * Ensures Section 9 (Derived State Law) is upheld across all active projects.
 */
export async function executeDriftReconciliationCycle(): Promise<void> {
  const admin = createAdminClient();
  
  // 1. Identify active projects for reconciliation scan
  // We prioritize projects that are not yet sealed to detect drift during the review lifecycle.
  const { data: projects, error } = await admin
    .from("projects")
    .select("id, name")
    .neq("certification_state", "CERTIFIED_LOCKED");

  if (error || !projects) {
    console.error("[DRIFT_DAEMON_ERROR] Failed to retrieve projects:", error);
    return;
  }

  // Execute the cycle within a governed operational boundary for traceability
  await runInOperationalMode("SYSTEM", async () => {
    await emitGovernanceEvent({
      category: "DRIFT_DAEMON_CYCLE",
      severity: "info",
      sourceLayer: "DRIFT_DAEMON",
      payload: { status: "started", projectCount: projects.length }
    });

    // 2. Proactive Convergence
    // Sequentially processing to avoid DB contention while ensuring causality linkage
    for (const project of projects) {
      try {
        await recomputeDerivedState(project.id);
        
        // Audit log of successful reconciliation
        await emitGovernanceEvent({
          category: "DRIFT_RECONCILIATION",
          severity: "info",
          sourceLayer: "DRIFT_DAEMON",
          projectId: project.id,
          payload: { status: "converged", projectName: project.name }
        });
      } catch (err: any) {
        await emitGovernanceEvent({
          category: "DRIFT_RECONCILIATION_FAILURE",
          severity: "warning",
          sourceLayer: "DRIFT_DAEMON",
          projectId: project.id,
          payload: { error: err.message }
        });
      }
    }

    await emitGovernanceEvent({
      category: "DRIFT_DAEMON_CYCLE",
      severity: "info",
      sourceLayer: "DRIFT_DAEMON",
      payload: { status: "completed" }
    });
  });
}
