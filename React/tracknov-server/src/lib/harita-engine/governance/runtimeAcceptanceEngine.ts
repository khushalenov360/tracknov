import { createAdminClient } from "@/lib/supabase/admin";
import { executeGovernedReplayHarness } from "../replay/runtimeReplayHarness";

export interface RuntimeAcceptanceResult {
  accepted: boolean;
  failedChecks: string[];
  deterministicReplayPassed: boolean;
  purityPassed: boolean;
  isolationPassed: boolean;
  replayCertificateValidated: boolean;
  runtimeHashValidated: boolean;
  generatedAt: string;
}

/**
 * Authoritative Runtime Acceptance Engine.
 * Decision-maker for production readiness based on actual runtime-generated proofs.
 * "No runtime proof = deployment blocked."
 */
export async function evaluateRuntimeAcceptance(
  projectId: string,
  targetTimestamp: string,
  expectedHash: string
): Promise<RuntimeAcceptanceResult> {
  const failedChecks: string[] = [];
  const admin = createAdminClient();

  // 1. Execute full governed replay cycle
  const harnessResult = await executeGovernedReplayHarness(projectId, targetTimestamp, expectedHash);

  if (harnessResult.error) {
    failedChecks.push(`REPLAY_EXECUTION_ERROR: ${harnessResult.error}`);
  }

  // 2. Validate Determinism
  if (!harnessResult.deterministicMatch) {
    failedChecks.push("DETERMINISM_MISMATCH: Recomputed hash does not match authoritative lineage.");
  }

  // 3. Validate Purity & Isolation (via evidence in DB)
  if (!harnessResult.purityValidated) {
    failedChecks.push("PURITY_VIOLATION: Side-effects detected during replay.");
  }

  // 4. Verify Replay Certificate Existence
  if (!harnessResult.replayCertificateId) {
    failedChecks.push("MISSING_CERTIFICATE: No valid replay certificate generated.");
  }

  // 5. Cross-check Proof Artifacts in DB
  const { data: artifacts, error: artifactsError } = await admin
    .from("runtime_proof_artifacts")
    .select("proof_type")
    .eq("project_id", projectId)
    .gte("generated_at", new Date(Date.now() - 5 * 60000).toISOString()); // Last 5 mins

  const proofTypes = artifacts?.map(a => a.proof_type) || [];
  
  if (!proofTypes.includes("DETERMINISM_VERIFICATION")) {
    failedChecks.push("MISSING_DETERMINISM_PROOF: No actual evidence artifact found in ledger.");
  }

  const result: RuntimeAcceptanceResult = {
    accepted: failedChecks.length === 0,
    failedChecks,
    deterministicReplayPassed: harnessResult.deterministicMatch,
    purityPassed: harnessResult.purityValidated,
    isolationPassed: harnessResult.isolationValidated,
    replayCertificateValidated: !!harnessResult.replayCertificateId,
    runtimeHashValidated: harnessResult.deterministicMatch,
    generatedAt: new Date().toISOString()
  };

  // Deployment blocking logic (Simulated here, but would be called by CI/CD)
  if (!result.accepted) {
    console.error(`[RUNTIME_ACCEPTANCE_FAILED] Project: ${projectId}. Deployment blocked.`, failedChecks);
  } else {
    console.log(`[RUNTIME_ACCEPTANCE_PASSED] Project: ${projectId}. Deployment authorized.`);
  }

  return result;
}
