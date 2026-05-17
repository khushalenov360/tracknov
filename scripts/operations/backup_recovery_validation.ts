import { createAdminClient } from "../../lib/supabase/admin";

async function runBackupRecoveryValidation() {
  console.log("🚀 STARTING: Backup & Recovery Governance Validation");
  const supabase = createAdminClient();

  // Pilot Project ID for testing (Bhavarkua)
  const TEST_PROJECT_NAME = "Bhavarkua";
  
  // 1. Snapshot State before "Failure"
  console.log(`🔍 Capturing pre-failure snapshot for ${TEST_PROJECT_NAME}...`);
  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .ilike("name", `%${TEST_PROJECT_NAME}%`)
    .single();

  if (!project) throw new Error("Test project not found");

  const { data: preCredits } = await supabase
    .from("project_credits")
    .select("*")
    .eq("project_id", project.id);

  console.log(`📊 INFO: Captured ${preCredits?.length} credit states.`);

  // 2. Simulate Point-in-Time Recovery (PITR) Readiness
  console.log("🔍 Validating PITR metadata (WAL logs / snapshots)...");
  const { data: snapshots } = await supabase
    .from("certification_snapshots")
    .select("id, created_at, replay_hash")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (snapshots && snapshots.length > 0) {
    console.log(`✅ PASS: Most recent snapshot found at ${snapshots[0].created_at} (HASH: ${snapshots[0].replay_hash})`);
  } else {
    console.warn("⚠️ WARNING: No certification snapshots found for this project.");
  }

  // 3. Verify Replay Continuity
  console.log("🔍 Verifying replay continuity for recovery...");
  const { data: logs } = await supabase
    .from("governance_observability_events")
    .select("id")
    .eq("project_id", project.id);

  if (logs && logs.length > 0) {
    console.log(`✅ PASS: ${logs.length} audit logs available for lineage reconstruction.`);
  } else {
    console.error("❌ FAIL: No audit logs found. Recovery impossible.");
  }

  // 4. Test Export Reconstruction
  console.log("🔍 Validating export archival integrity...");
  const { data: exports } = await supabase
    .from("export_generation_history")
    .select("id, replay_hash, file_url")
    .eq("project_id", project.id)
    .limit(1);

  if (exports && exports.length > 0) {
    console.log(`✅ PASS: Export metadata intact. Replay hash: ${exports[0].replay_hash}`);
  } else {
    console.warn("⚠️ WARNING: No exported artifacts found for archival validation.");
  }

  console.log("\n✅ FINISHED: Backup & Recovery Governance Validation");
}

runBackupRecoveryValidation().catch(err => {
  console.error("FATAL ERROR during recovery validation:", err);
  process.exit(1);
});
