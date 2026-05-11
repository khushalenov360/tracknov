import { createAdminClient } from "@/lib/supabase/admin";

export async function recomputeDerivedState(projectId: string): Promise<void> {
  const admin = createAdminClient();

  await admin.rpc("recalculate_project_state", { p_project_id: projectId });
  await admin.rpc("recalculate_certification_state", { p_project_id: projectId });
}

export async function rebuildDerivedState(projectId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("rebuild_derived_states", { p_project_id: projectId });
}
