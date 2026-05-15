import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Core Derived State Computation Engine.
 * Authoritative implementation enforcing Section 9 (Derived State Law) and Section 34 (Dependency Graph Model).
 * Guarantees that readiness, framework scoring, and eligibility metrics are computed exclusively on the server side.
 * Frontend client readiness/scoring inferences are strictly prohibited from mutating persistence layers.
 */

export async function recomputeDerivedState(projectId: string): Promise<void> {
  const admin = createAdminClient();

  // Enforce Section 34 Derived Dependency Propagation: cascade project scores -> certification state
  await admin.rpc("recalculate_project_state", { p_project_id: projectId });
  await admin.rpc("recalculate_certification_state", { p_project_id: projectId });
}

export async function rebuildDerivedState(projectId: string): Promise<void> {
  const admin = createAdminClient();
  // Authoritative full state dependency graph rebuild
  await admin.rpc("rebuild_derived_states", { p_project_id: projectId });
}
