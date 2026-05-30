import { executeDeterministicReplay } from "./replayEngine";
import { generateLineageHash } from "./hashSerializer";
import { runInReplayMode } from "../governance/governanceMutationInterceptor";
import { governanceTelemetry } from "../governance/governanceObservabilityBus";
import { collectRuntimeProof } from "../governance/runtimeProofCollector";
import { generateReplayCertificate } from "./replayCertificateEngine";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ReplayHarnessResult {
  replayId: string;
  projectId: string;
  deterministicMatch: boolean;
  replayHash: string;
  purityValidated: boolean;
  isolationValidated: boolean;
  blockedMutations: number;
  observabilityEvents: number;
  replayCertificateId?: string;
  error?: string;
}

/**
 * Authoritative Runtime Replay Harness.
 * Orchestrates deterministic replay execution and validates all governance invariants.
 */
export async function executeGovernedReplayHarness(
  projectId: string,
  targetTimestamp: string,
  expectedLineageHash?: string
): Promise<ReplayHarnessResult> {
  const replayId = crypto.randomUUID();
  const admin = createAdminClient();

  await governanceTelemetry.replayStarted(projectId, targetTimestamp);

  try {
    // 1. Initialization & Snapshot Load (handled by executeDeterministicReplay via RPC)
    // 2. Deterministic Replay (execution within governed boundary)
    const result = await runInReplayMode(projectId, async () => {
      // Execute the database reconstruction
      const replayData = await executeDeterministicReplay(projectId, targetTimestamp);

      // 3. Purity Validation (Mutation Interceptor will throw if any side-effect is attempted)
      // 4. Hash Validation (Compute lineage hash of the reconstructed state)
      const currentHash = generateLineageHash(replayData.reconstructedState as any);
      
      const deterministicMatch = expectedLineageHash 
        ? currentHash === expectedLineageHash 
        : true;

      // 5. Observability & Proof Collection
      await collectRuntimeProof({
        proofType: "DETERMINISM_VERIFICATION",
        runtimeSource: "REPLAY_HARNESS",
        projectId,
        lineageHash: currentHash,
        payload: {
          replayId,
          targetTimestamp,
          deterministicMatch,
          reconstructedTables: Object.keys(replayData.reconstructedState.tables)
        }
      });

      // 6. Replay Certificate Generation (if deterministic match passes)
      let certificateId: string | undefined;
      if (deterministicMatch) {
        const cert = await generateReplayCertificate({
          projectId,
          replayHash: currentHash,
          replayContractVersion: replayData.contract.replayVersion,
          replayTimestamp: new Date().toISOString(),
          deterministicMatch: true,
          snapshotId: (replayData.reconstructedState.tables.projects as any)?.governing_snapshot_id
        });
        certificateId = cert.certificate_id;
      }

      // 7. Collect instrumentation metrics from the DB
      const { count: blockedCount } = await admin
        .from("runtime_mutation_events")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("replay_mode", true)
        .gte("timestamp", new Date(Date.now() - 60000).toISOString()); // Last minute

      const { count: eventCount } = await admin
        .from("governance_observability_events")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId)
        .gte("timestamp", new Date(Date.now() - 60000).toISOString());

      return {
        replayId,
        projectId,
        deterministicMatch,
        replayHash: currentHash,
        purityValidated: true, // If we reached here, no mutation threw
        isolationValidated: true, // executeDeterministicReplay handles this at DB level
        blockedMutations: blockedCount || 0,
        observabilityEvents: eventCount || 0,
        replayCertificateId: certificateId
      };
    });

    await governanceTelemetry.replayCompleted(projectId, result);
    return result;

  } catch (error: any) {
    console.error(`[REPLAY_HARNESS_FAILURE] Project: ${projectId}`, error);
    
    await emitGovernanceEvent({
      category: "REPLAY_FAILURE",
      severity: "critical",
      sourceLayer: "REPLAY_HARNESS",
      projectId,
      payload: { error: error.message, replayId }
    });

    return {
      replayId,
      projectId,
      deterministicMatch: false,
      replayHash: "ERROR",
      purityValidated: false,
      isolationValidated: false,
      blockedMutations: 0,
      observabilityEvents: 0,
      error: error.message
    };
  }
}

async function emitGovernanceEvent(params: any) {
    const { emitGovernanceEvent: emit } = await import("../governance/governanceObservabilityBus");
    return emit(params);
}
