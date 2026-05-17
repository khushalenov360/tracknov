import { createAdminClient } from "@/lib/supabase/admin";
import { generateLineageHash } from "./hashSerializer";

/**
 * Recomputes and validates lineage hashes for snapshots to guarantee immutability and verify audit proof.
 */
export async function verifySnapshotIntegrity(snapshotId: string): Promise<{
  isValid: boolean;
  expectedHash: string;
  actualHash: string;
  snapshotData: Record<string, unknown> | null;
}> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("certification_snapshots")
    .select("*")
    .eq("id", snapshotId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to load snapshot for integrity validation: ${error?.message || "Not found"}`);
  }

  // Recompute the lineage hash based on retrieved snapshot data
  const recomputedHash = generateLineageHash({
    workflowLineage: data.workflow_state || data.workflow_snapshot,
    certificationState: data.certification_state || data.scoring_snapshot,
    derivedState: data.derived_state || {},
    dependencyGraph: data.dependency_graph || {},
    exportReferences: data.export_references || {},
    replayContractVersion: data.replay_contract_version || "v1.0-deterministic",
  });

  const actualHash = data.lineage_hash || data.certification_snapshot_hash;
  const isValid = recomputedHash === actualHash;

  return {
    actualHash,
    expectedHash: recomputedHash,
    isValid,
    snapshotData: data,
  };
}
