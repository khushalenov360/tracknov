import { createAdminClient } from "@/lib/supabase/admin";
import { generateLineageHash } from "./hashSerializer";

export interface SnapshotConfigPayload {
  projectId: string;
  frameworkType: string;
  snapshotType: string;
  parentSnapshotId?: string | null;
  workflowState: Record<string, unknown>;
  certificationState: Record<string, unknown>;
  derivedState: Record<string, unknown>;
  exportReferences: Record<string, unknown>;
  dependencyGraph: Record<string, unknown>;
  createdBy?: string | null;
}

const REPLAY_CONTRACT_VERSION_V1 = "v1.0-deterministic";

/**
 * Creates immutable snapshot conforming to SNAPSHOT_SCHEMA_V1.
 * Snapshots become authoritative historical reconstruction anchors.
 */
export async function generateSnapshot(payload: SnapshotConfigPayload) {
  const admin = createAdminClient();

  // Determine snapshot_version by counting existing snapshots for the project
  const { count, error: countError } = await admin
    .from("certification_snapshots")
    .select("id", { count: "exact", head: true })
    .eq("project_id", payload.projectId);

  if (countError) {
    throw new Error(`Failed to query snapshot count: ${countError.message}`);
  }

  const snapshotVersion = (count || 0) + 1;

  // Build canonical lineage hash
  const lineageHash = generateLineageHash({
    workflowLineage: payload.workflowState,
    certificationState: payload.certificationState,
    derivedState: payload.derivedState,
    dependencyGraph: payload.dependencyGraph,
    exportReferences: payload.exportReferences,
    replayContractVersion: REPLAY_CONTRACT_VERSION_V1,
  });

  // Prepare DB record insertion adhering to both existing columns and new columns
  // Note: certification_snapshot_hash is required by existing table definition.
  const { data, error } = await admin
    .from("certification_snapshots")
    .insert({
      project_id: payload.projectId,
      framework_type: payload.frameworkType,
      snapshot_type: payload.snapshotType,
      snapshot_version: snapshotVersion,
      lineage_hash: lineageHash,
      parent_snapshot_id: payload.parentSnapshotId || null,
      workflow_state: payload.workflowState,
      certification_state: payload.certificationState,
      derived_state: payload.derivedState,
      export_references: payload.exportReferences,
      dependency_graph: payload.dependencyGraph,
      replay_contract_version: REPLAY_CONTRACT_VERSION_V1,
      immutable_lock: true,
      created_by: payload.createdBy || null,
      // Supply defaults for legacy non-nullable columns to ensure DB guard safety
      certification_snapshot_hash: lineageHash,
      evidence_snapshot: [],
      validation_snapshot: [],
      scoring_snapshot: payload.certificationState,
      workflow_snapshot: payload.workflowState,
      assignment_snapshot: [],
      override_lineage: [],
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Immutable snapshot generation failed: ${error.message}`);
  }

  return data;
}

/**
 * Loads replay-safe snapshot boundary for a given timestamp.
 */
export async function loadSnapshotBoundary(projectId: string, targetTimestamp: string) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("certification_snapshots")
    .select("*")
    .eq("project_id", projectId)
    .lte("created_at", targetTimestamp)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 is row not found
    throw new Error(`Failed to load snapshot boundary: ${error.message}`);
  }

  return data || null;
}
