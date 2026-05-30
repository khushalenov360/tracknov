import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createAdminClient } from "../lib/supabase/admin";
import { aggregateSoakMetrics, persistSoakMetrics } from "@tracknov/harita-engine/governance/runtimeSoakMetrics";
import { detectSoakAnomalies } from "@tracknov/harita-engine/governance/runtimeSoakIncidentEngine";
import { validateLongDurationReplay } from "@tracknov/harita-engine/governance/longDurationReplayValidator";
import { acquireReplayLock, releaseReplayLock } from "@tracknov/harita-engine/governance/replayConflictResolutionEngine";
import { detectRuntimeEntropy } from "@tracknov/harita-engine/governance/runtimeEntropyEngine";
import { governanceLocalStorage } from "@tracknov/harita-engine/governance/governanceContext";
import crypto from "node:crypto";

import { env } from "../lib/env";

console.log(`- Supabase URL: ${env.supabaseUrl}`);
console.log(`- Service Role Key Length: ${env.supabaseServiceRoleKey?.length ?? 0}`);

const PROJECT_ID = "b73d7310-df16-4d26-b6c8-61bebb197410"; // Bhavarkua
const ACTOR_ID = "c6a2e4e1-7d1a-4c1a-8c1a-7d1a4c1a8c1a";

/**
 * TRACKNOV RUNTIME SOAK HARNESS V1
 * 
 * Simulates continuous governance load over long durations.
 */
async function runRuntimeSoak() {
  const durationHours = parseFloat(process.argv[2] || "1"); // Default 1 hour for test
  const endTime = Date.now() + durationHours * 60 * 60 * 1000;

  console.log(`🚀 STARTING TRACKNOV RUNTIME SOAK V1`);
  console.log(`- Duration: ${durationHours} hours`);
  console.log(`- Target Project: ${PROJECT_ID}`);
  console.log(`- End Time: ${new Date(endTime).toLocaleString()}`);

  let iteration = 0;

  while (Date.now() < endTime) {
    iteration++;
    console.log(`\n[ITERATION ${iteration}] [${new Date().toLocaleTimeString()}]`);

    try {
      // 1. Simulate Traffic (Replay Storm + Lock Contention)
      await simulateReplayTraffic();

      // 2. Simulate Workflow Mutations
      await simulateWorkflowMutations();

      // 3. Simulate Drift Pressure
      await simulateDriftPressure();

      // 3.1 Simulate Queue Pressure
      await simulateQueuePressure();

      // 3.2 Simulate Override Pressure
      await simulateOverridePressure();

      // 4. Run Engines
      await detectRuntimeEntropy(PROJECT_ID);
      await detectSoakAnomalies(PROJECT_ID);
      await validateLongDurationReplay(PROJECT_ID);

      // 5. Aggregate and Persist Metrics
      const metrics = await aggregateSoakMetrics(PROJECT_ID);
      await persistSoakMetrics(PROJECT_ID, metrics);

      console.log(`- Metrics: Drift=${metrics.replayDriftRate}%, Locks=${metrics.activeReplayLocks}, Mem=${(metrics.memoryUsageBytes / 1024 / 1024).toFixed(2)}MB`);

    } catch (error) {
      console.error(`- Error in iteration ${iteration}:`, error.message);
    } finally {
      // Wait between iterations - ALWAYS wait to prevent CPU spikes on persistent error
      await new Promise(r => setTimeout(r, 10000)); // 10s intervals
    }
  }

  console.log(`\n✅ SOAK TEST COMPLETE. TOTAL ITERATIONS: ${iteration}`);
}

async function simulateReplayTraffic() {
  console.log("  > Simulating Replay Traffic...");
  const concurrency = 3;
  await Promise.allSettled(
    Array.from({ length: concurrency }).map(() => {
      const traceId = crypto.randomUUID();
      return (governanceLocalStorage as any).run({ traceId, actorId: ACTOR_ID, projectId: PROJECT_ID }, async () => {
        const acquired = await acquireReplayLock(PROJECT_ID);
        if (acquired) {
          await new Promise(r => setTimeout(r, 1000));
          await releaseReplayLock(PROJECT_ID);
        }
      });
    })
  );
}

async function simulateWorkflowMutations() {
  console.log("  > Simulating Workflow Mutations...");
  const admin = createAdminClient();
  const states = ["PENDING", "UPLOADED", "UNDER_REVIEW", "CLARIFICATION", "APPROVED"];
  const randomState = states[Math.floor(Math.random() * states.length)];
  
  await admin.from("workflow_history").insert({
    project_id: PROJECT_ID,
    from_state: "SOAK_TEST",
    to_state: randomState,
    actor_id: ACTOR_ID,
    reason: "Long-duration runtime soak mutation simulation."
  });
}

async function simulateDriftPressure() {
  console.log("  > Simulating Drift Pressure...");
  const admin = createAdminClient();
  await admin.from("reconciliation_items").insert({
    project_id: PROJECT_ID,
    entity_type: "project",
    entity_id: PROJECT_ID,
    issue_type: "soak_pressure_drift",
    details: { iteration: Date.now() },
    status: "OPEN"
  });
}

async function simulateQueuePressure() {
  console.log("  > Simulating Queue Pressure...");
  const admin = createAdminClient();
  const traceId = crypto.randomUUID();
  
  // Rapid enqueue/dequeue churn
  await admin.from("replay_queue").insert({
    project_id: PROJECT_ID,
    trace_id: traceId,
    target_timestamp: new Date().toISOString(),
    status: "queued",
    priority: Math.floor(Math.random() * 10)
  });

  // Starvation simulation: Insert old items
  await admin.from("replay_queue").insert({
    project_id: PROJECT_ID,
    trace_id: crypto.randomUUID(),
    target_timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour old
    status: "queued",
    priority: 0
  });
}

async function simulateOverridePressure() {
  console.log("  > Simulating Override Pressure...");
  const admin = createAdminClient();
  
  await admin.from("override_safety_reports").insert({
    project_id: PROJECT_ID,
    override_type: "SOAK_STRESS_TEST",
    reason: "Automated soak pressure simulation.",
    actor_id: ACTOR_ID,
    blast_radius: { nodes: 15 },
    replay_impact_validation: { driftDetected: false }
  });
}

runRuntimeSoak();
