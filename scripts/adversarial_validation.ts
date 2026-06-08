import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { executeGovernedReplayHarness } from "@/lib/harita-engine/governance/runtimeReplayHarness";
import { interceptMutation, runInReplayMode } from "@/lib/harita-engine/governance/governanceMutationInterceptor";
import { evaluateRuntimeAcceptance } from "@/lib/harita-engine/governance/runtimeAcceptanceEngine";
import { createAdminClient } from "../lib/supabase/admin";

const BHAVARKUA_PROJECT_ID = "b73d7310-df16-4d26-b6c8-61bebb197410";
const MOCK_TARGET_TIMESTAMP = new Date().toISOString();

async function runAdversarialValidation() {
  console.log("--- STARTING ADVERSARIAL RUNTIME VALIDATION V1 ---");
  const admin = createAdminClient();

  // --- SUITE 1: CONCURRENT REPLAY STRESS TEST ---
  console.log("\n[SUITE 1] CONCURRENT REPLAY STRESS TEST");
  const concurrentRuns = Array.from({ length: 5 }).map(() => 
    executeGovernedReplayHarness(BHAVARKUA_PROJECT_ID, MOCK_TARGET_TIMESTAMP)
  );
  const results1 = await Promise.all(concurrentRuns);
  const hashes = results1.map(r => r.replayHash);
  const allMatch = hashes.every(h => h === hashes[0]);
  console.log(`- CONCURRENT_RUNS: 5`);
  console.log(`- DETERMINISM_CONSISTENT: ${allMatch}`);
  console.log(`- ALL_HAVE_CERTIFICATES: ${results1.every(r => !!r.replayCertificateId)}`);

  // --- SUITE 2: REPLAY MUTATION ATTACK TEST ---
  console.log("\n[SUITE 2] REPLAY MUTATION ATTACK TEST");
  try {
    await runInReplayMode(BHAVARKUA_PROJECT_ID, async () => {
      console.log("- ATTEMPTING DB WRITE IN REPLAY MODE...");
      await interceptMutation({
        mutationType: "DB_WRITE",
        sourceLayer: "ADVERSARIAL_TEST",
        reason: "SIMULATED_ATTACK"
      });
    });
  } catch (error: any) {
    console.log(`- INTERCEPTION_SUCCESS: ${error.message.includes("Intercepted")}`);
  }

  // --- SUITE 4: REPLAY TAMPERING TEST ---
  console.log("\n[SUITE 4] REPLAY TAMPERING TEST");
  const tamperedResult = await executeGovernedReplayHarness(
    BHAVARKUA_PROJECT_ID, 
    MOCK_TARGET_TIMESTAMP, 
    "forged-hash-123"
  );
  console.log(`- TAMPER_DETECTION: ${!tamperedResult.deterministicMatch}`);
  console.log(`- CERTIFICATE_BLOCKED: ${!tamperedResult.replayCertificateId}`);

  // --- SUITE 7: DERIVED-STATE DRIFT TEST ---
  console.log("\n[SUITE 7] DERIVED-STATE DRIFT TEST");
  const runA = await executeGovernedReplayHarness(BHAVARKUA_PROJECT_ID, MOCK_TARGET_TIMESTAMP);
  const runB = await executeGovernedReplayHarness(BHAVARKUA_PROJECT_ID, MOCK_TARGET_TIMESTAMP);
  console.log(`- RUN_A_HASH: ${runA.replayHash}`);
  console.log(`- RUN_B_HASH: ${runB.replayHash}`);
  console.log(`- DRIFT_DETECTED: ${runA.replayHash !== runB.replayHash}`);

  // --- FINAL ACCEPTANCE MATRIX ---
  console.log("\n--- FINAL ACCEPTANCE MATRIX ---");
  const acceptance = await evaluateRuntimeAcceptance(
    BHAVARKUA_PROJECT_ID,
    MOCK_TARGET_TIMESTAMP,
    runA.replayHash
  );
  console.log(`- ACCEPTED: ${acceptance.accepted}`);
  console.log(`- FAILED_CHECKS: ${acceptance.failedChecks.join(", ") || "NONE"}`);

  console.log("\n--- GATHERING RUNTIME EVIDENCE FROM LEDGER ---");
  const { data: mutationEvents } = await admin
    .from("runtime_mutation_events")
    .select("*")
    .eq("project_id", BHAVARKUA_PROJECT_ID)
    .order("timestamp", { ascending: false })
    .limit(5);

  const { data: artifacts } = await admin
    .from("runtime_proof_artifacts")
    .select("*")
    .eq("project_id", BHAVARKUA_PROJECT_ID)
    .order("generated_at", { ascending: false })
    .limit(5);

  console.log("\n[ACTUAL EVIDENCE: runtime_mutation_events]");
  console.table(mutationEvents?.map(e => ({ type: e.mutation_type, blocked: e.blocked, reason: e.reason })));

  console.log("\n[ACTUAL EVIDENCE: runtime_proof_artifacts]");
  console.table(artifacts?.map(a => ({ type: a.proof_type, source: a.runtime_source })));
}

runAdversarialValidation().catch(console.error);
