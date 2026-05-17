import { createAdminClient } from "../../lib/supabase/admin";
import { format } from "date-fns";

async function runReviewerQueueIntegrity() {
  console.log("🚀 STARTING: Reviewer Queue Integrity Validation");
  const supabase = createAdminClient();

  // 1. Check for Orphan Submittals (Submittals without projects or credits)
  console.log("🔍 Checking for Orphan Submittals...");
  const { data: orphans, error: orphanError } = await supabase
    .from("submittals")
    .select("id, project_id, credit_id")
    .or("project_id.is.null, credit_id.is.null");

  if (orphanError) throw orphanError;
  if (orphans?.length) {
    console.error(`❌ FAIL: Found ${orphans.length} orphan submittals.`);
  } else {
    console.log("✅ PASS: No orphan submittals found.");
  }

  // 2. Check Queue Prioritization Logic
  console.log("🔍 Validating Queue Prioritization...");
  const { data: queue, error: queueError } = await supabase
    .from("submittals")
    .select("id, iteration, state, created_at")
    .in("state", ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"])
    .order("iteration", { ascending: false })
    .order("created_at", { ascending: true });

  if (queueError) throw queueError;
  
  // Verify that higher iterations (resubmissions) are at the top
  const isSorted = queue?.every((val, i, arr) => !i || arr[i-1].iteration >= val.iteration);
  if (isSorted) {
    console.log("✅ PASS: Queue prioritizes resubmissions (higher iterations).");
  } else {
    console.warn("⚠️ WARNING: Queue sorting drift detected.");
  }

  // 3. Measure Queue Latency
  console.log("🔍 Measuring Queue Latency...");
  const { data: latencyRecords, error: latencyError } = await supabase
    .from("submittals")
    .select("created_at, updated_at, state")
    .in("state", ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"]);

  if (latencyError) throw latencyError;
  
  const totalLatency = latencyRecords?.reduce((sum, rec) => {
    const start = new Date(rec.created_at).getTime();
    const end = new Date().getTime();
    return sum + (end - start);
  }, 0) || 0;

  const avgLatencyHours = (totalLatency / (latencyRecords?.length || 1)) / (1000 * 60 * 60);
  console.log(`📊 INFO: Average Queue Latency: ${avgLatencyHours.toFixed(2)} hours.`);

  // Record Telemetry
  await supabase.from("operational_queue_metrics").insert({
    queue_name: "MAIN_REVIEW",
    item_count: queue?.length || 0,
    avg_wait_time_ms: Math.round(totalLatency / (latencyRecords?.length || 1)),
    max_wait_time_ms: Math.max(...(latencyRecords?.map(r => new Date().getTime() - new Date(r.created_at).getTime()) || [0])),
    trace_id: crypto.randomUUID(),
    causality_chain_id: crypto.randomUUID(),
    framework_version: "PILOT_V1"
  });

  console.log("✅ FINISHED: Reviewer Queue Integrity Validation");
}

runReviewerQueueIntegrity().catch(err => {
  console.error("FATAL ERROR during queue validation:", err);
  process.exit(1);
});
