import { createAdminClient } from "@/lib/supabase/admin";
import { reportGovernanceIncident } from "../governance/governanceIncidentEngine";

/**
 * LONG DURATION REPLAY VALIDATOR
 * 
 * Ensures that historical snapshots remain valid and reproducible throughout the soak test.
 */
export async function validateLongDurationReplay(projectId: string): Promise<boolean> {
  const admin = createAdminClient();

  // 1. Fetch random historical snapshot
  const { data: snapshots } = await admin
    .from("certification_snapshots")
    .select("id, certification_snapshot_hash, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!snapshots || snapshots.length === 0) return true;

  // Pick one to re-verify
  const target = snapshots[Math.floor(Math.random() * snapshots.length)];

  // 2. Cross-reference with Replay Certificates
  const { data: certificate } = await admin
    .from("replay_certificates")
    .select("replay_hash, deterministic_match")
    .eq("snapshot_id", target.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (certificate && certificate.replay_hash !== target.certification_snapshot_hash) {
    await reportGovernanceIncident({
      type: "replay_hash_mismatch",
      severity: "critical",
      projectId,
      replayContext: {
        snapshotId: target.id,
        storedHash: target.certification_snapshot_hash,
        certificateHash: certificate.replay_hash,
        detectedAt: new Date().toISOString()
      }
    });
    return false;
  }

  // 3. Verify Deterministic Pass Count
  const { count: passCount } = await admin
    .from("replay_certificates")
    .select("*", { count: 'exact', head: true })
    .eq("snapshot_id", target.id)
    .eq("deterministic_match", true);

  if (passCount && passCount < 3) {
    // We expect at least 3 consecutive passes for long-duration stability
    console.log(`[SOAK] Warning: Snapshot ${target.id} only has ${passCount} passes.`);
  }

  return true;
}
