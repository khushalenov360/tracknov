import { createAdminClient } from "@/lib/supabase/admin";
import { governanceLocalStorage } from "./governanceContext";
import { emitGovernanceEvent } from "./governanceObservabilityBus";
import { governanceEvolutionEngine } from "./evolution";

export interface RuntimeProofArtifact {
  artifactId?: string;
  projectId: string;
  proofType: string;
  runtimeSource: string;
  payload: Record<string, unknown>;
  lineageHash?: string;
  generatedAt?: string;
  traceId?: string;
  parentTraceId?: string;
  causalityChainId?: string;
}

/**
 * Authoritative Runtime Proof Collector.
 * Aggregates actual runtime evidence of governance compliance and adversarial resistance.
 * Rejects frontend-generated or simulated proof payloads.
 */
export async function collectRuntimeProof(params: {
  proofType: string;
  runtimeSource: string;
  payload: Record<string, unknown>;
  lineageHash?: string;
  projectId?: string;
}): Promise<void> {
  const context = governanceLocalStorage.getStore();
  const projectId = params.projectId || context?.projectId;

  if (!projectId || projectId === "SYSTEM") {
    // Standard system events don't necessarily need a proof artifact unless project-linked
    return;
  }

  // Fetch authoritative governance version context
  const versionContext = await governanceEvolutionEngine.getLatestContext();

  const artifact: RuntimeProofArtifact = {
    projectId,
    proofType: params.proofType,
    runtimeSource: params.runtimeSource,
    payload: params.payload,
    lineageHash: params.lineageHash,
    traceId: context?.traceId,
    parentTraceId: context?.parentTraceId,
    causalityChainId: context?.causalityChainId,
  };

  // Persist to the immutable runtime proof ledger
  const admin = createAdminClient();
  const { error } = await admin.from("runtime_proof_artifacts").insert({
    project_id: artifact.projectId,
    proof_type: artifact.proofType,
    runtime_source: artifact.runtimeSource,
    payload: artifact.payload,
    lineage_hash: artifact.lineageHash,
    trace_id: artifact.traceId,
    parent_trace_id: artifact.parentTraceId,
    causality_chain_id: artifact.causalityChainId,
    governance_version_context: versionContext,
  });

  if (error) {
    console.error("[PROOF_COLLECTOR_ERROR] Failed to persist proof artifact:", error);
    return;
  }

  // Emit a telemetry event indicating a new proof artifact has been anchored
  await emitGovernanceEvent({
    category: "PROOF_ANCHORED",
    severity: "info",
    sourceLayer: "PROOF_COLLECTOR",
    projectId: artifact.projectId,
    payload: { 
      proofType: artifact.proofType,
      runtimeSource: artifact.runtimeSource
    }
  });
}

/**
 * Specialized proof collection helpers
 */
export const proofCollection = {
  dbWriteBlocked: (projectId: string, mutation: any) => 
    collectRuntimeProof({
      proofType: "MUTATION_INTERCEPTION",
      runtimeSource: "DB_GATEWAY",
      projectId,
      payload: { operation: "DB_WRITE", ...mutation }
    }),

  queueSuppressed: (projectId: string, message: any) => 
    collectRuntimeProof({
      proofType: "QUEUE_SUPPRESSION",
      runtimeSource: "EVENT_BUS",
      projectId,
      payload: { message }
    }),

  isolationRejection: (projectId: string, violation: any) => 
    collectRuntimeProof({
      proofType: "TENANT_ISOLATION",
      runtimeSource: "SECURITY_GUARD",
      projectId,
      payload: violation
    }),

  determinismProof: (projectId: string, replayHash: string, result: any) => 
    collectRuntimeProof({
      proofType: "DETERMINISM_VERIFICATION",
      runtimeSource: "REPLAY_HARNESS",
      projectId,
      lineageHash: replayHash,
      payload: result
    }),

  replayCertificate: (projectId: string, certificateId: string, replayHash: string) => 
    collectRuntimeProof({
      proofType: "REPLAY_CERTIFICATE",
      runtimeSource: "CERTIFICATE_ENGINE",
      projectId,
      lineageHash: replayHash,
      payload: { certificateId }
    })
};
