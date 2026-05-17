import { createAdminClient } from "@/lib/supabase/admin";
import { governanceLocalStorage } from "./governanceContext";
import type { GovernanceContext } from "./governanceContext";
import { emitGovernanceEvent } from "./governanceObservabilityBus";
import { collectRuntimeProof } from "./runtimeProofCollector";

export interface MutationInterceptionEvent {
  eventId?: string;
  projectId: string;
  actorId?: string;
  mutationType: string;
  sourceLayer: string;
  replayMode: boolean;
  reason: string;
  timestamp?: string;
  traceId?: string;
  parentTraceId?: string;
  causalityChainId?: string;
  blocked?: boolean;
}

// Using central GovernanceContext from ./governanceContext

/**
 * Intercepts ACTUAL runtime mutations during replay.
 * Blocks DB writes, queue emissions, and other side-effects when replayMode is active.
 * Records every attempt in the append-only runtime_mutation_events ledger.
 */
export async function interceptMutation(params: {
  mutationType: string;
  sourceLayer: string;
  reason?: string;
  payload?: any;
}): Promise<void> {
  const context = governanceLocalStorage.getStore();
  const replayMode = context?.replayMode ?? false;
  const projectId = context?.projectId ?? "SYSTEM";
  const actorId = context?.actorId;

  const event: MutationInterceptionEvent = {
    projectId,
    actorId,
    mutationType: params.mutationType,
    sourceLayer: params.sourceLayer,
    replayMode,
    blocked: replayMode,
    reason: params.reason || (replayMode ? "REPLAY_MODE_ACTIVE" : "OPERATIONAL_MODE"),
    traceId: context?.traceId,
    parentTraceId: context?.parentTraceId,
    causalityChainId: context?.causalityChainId,
  };

  // Persist the interception event to the authoritative runtime evidence ledger.
  // We use the admin client directly to ensure the audit log itself is not blocked.
  const admin = createAdminClient();
  const { error } = await admin.from("runtime_mutation_events").insert({
    project_id: event.projectId === "SYSTEM" ? null : event.projectId,
    actor_id: event.actorId,
    mutation_type: event.mutationType,
    source_layer: event.sourceLayer,
    replay_mode: event.replayMode,
    blocked: event.blocked,
    reason: event.reason,
    trace_id: event.traceId,
    parent_trace_id: event.parentTraceId,
    causality_chain_id: event.causalityChainId,
  });

  if (error) {
    console.error("[GOVERNANCE_INTERCEPTOR_ERROR] Failed to persist mutation event:", error);
  }

  // If blocked, also emit a critical governance telemetry event and collect a runtime proof artifact
  if (event.blocked) {
    await Promise.all([
      emitGovernanceEvent({
        category: "PURITY_VIOLATION",
        severity: "critical",
        sourceLayer: event.sourceLayer,
        projectId: event.projectId,
        payload: { 
          mutationType: event.mutationType,
          reason: event.reason,
          replayMode: event.replayMode
        }
      }),
      collectRuntimeProof({
        proofType: "MUTATION_INTERCEPTION",
        runtimeSource: event.sourceLayer,
        projectId: event.projectId,
        payload: { 
          mutationType: event.mutationType,
          reason: event.reason,
          replayMode: event.replayMode
        }
      })
    ]);

    throw new Error(
      `Governance Purity Violation: Attempted [${event.mutationType}] in [${event.sourceLayer}]. Intercepted due to REPLAY_MODE_ACTIVE.`
    );
  }
}

/**
 * Higher-order function to execute logic within a governed replay boundary.
 */
export async function runInReplayMode<T>(
  projectId: string,
  fn: () => Promise<T>,
  actorId?: string
): Promise<T> {
  return governanceLocalStorage.run({ 
    projectId, 
    replayMode: true,
    traceId: crypto.randomUUID(),
    causalityChainId: crypto.randomUUID()
  }, fn);
}

/**
 * Higher-order function to execute logic within a standard operational boundary.
 */
export async function runInOperationalMode<T>(
  projectId: string,
  fn: () => Promise<T>,
  actorId?: string
): Promise<T> {
  return governanceLocalStorage.run(
    { 
      projectId, 
      actorId, 
      replayMode: false,
      traceId: crypto.randomUUID(),
      causalityChainId: crypto.randomUUID()
    },
    fn
  );
}
