import { createAdminClient } from "@/lib/supabase/admin";
import { governanceLocalStorage } from "./governanceContext";

export interface GovernanceObservabilityEvent {
  eventId?: string;
  projectId?: string;
  actorId?: string;
  category: string;
  severity: "info" | "warning" | "critical";
  sourceLayer: string;
  timestamp?: string;
  traceId?: string;
  parentTraceId?: string;
  causalityChainId?: string;
}

/**
 * Enterprise Governance Telemetry Bus.
 * Centralizes all governance-related runtime observations for audit and alerting.
 */
export async function emitGovernanceEvent(params: {
  category: string;
  severity: "info" | "warning" | "critical";
  sourceLayer: string;
  payload?: Record<string, unknown>;
  projectId?: string;
}): Promise<void> {
  const context = governanceLocalStorage.getStore();
  const replayMode = context?.replayMode ?? false;
  const projectId = params.projectId || context?.projectId;
  const actorId = context?.actorId;

  const event: GovernanceObservabilityEvent = {
    projectId,
    actorId,
    category: params.category,
    severity: params.severity,
    sourceLayer: params.sourceLayer,
    replayMode,
    payload: params.payload || {},
    traceId: context?.traceId,
    parentTraceId: context?.parentTraceId,
    causalityChainId: context?.causalityChainId,
  };

  // Persist to the immutable governance observability ledger
  const admin = createAdminClient();
  const { error } = await admin.from("governance_observability_events").insert({
    project_id: event.projectId === "SYSTEM" ? null : event.projectId,
    actor_id: event.actorId,
    category: event.category,
    severity: event.severity,
    source_layer: event.sourceLayer,
    replay_mode: event.replayMode,
    payload: event.payload,
    trace_id: event.traceId,
    parent_trace_id: event.parentTraceId,
    causality_chain_id: event.causalityChainId,
  });

  if (error) {
    console.error("[GOVERNANCE_OBSERVABILITY_ERROR] Failed to persist telemetry event:", error);
  }

  // Log to console for real-time observability in dev/staging
  const logPrefix = `[GOVERNANCE_${event.severity.toUpperCase()}] [${event.sourceLayer}] [${event.category}]`;
  if (event.severity === "critical") {
    console.error(logPrefix, event.payload);
  } else if (event.severity === "warning") {
    console.warn(logPrefix, event.payload);
  } else {
    console.log(logPrefix, event.payload);
  }
}

/**
 * Utility to emit common governance events
 */
export const governanceTelemetry = {
  replayStarted: (projectId: string, snapshotId: string) => 
    emitGovernanceEvent({
      category: "REPLAY_LIFECYCLE",
      severity: "info",
      sourceLayer: "REPLAY_ENGINE",
      projectId,
      payload: { status: "started", snapshotId }
    }),

  replayCompleted: (projectId: string, result: any) => 
    emitGovernanceEvent({
      category: "REPLAY_LIFECYCLE",
      severity: "info",
      sourceLayer: "REPLAY_ENGINE",
      projectId,
      payload: { status: "completed", ...result }
    }),

  isolationViolation: (projectId: string, attemptedAccess: string) => 
    emitGovernanceEvent({
      category: "ISOLATION_VIOLATION",
      severity: "critical",
      sourceLayer: "TENANT_GUARD",
      projectId,
      payload: { attemptedAccess }
    }),

  authFailure: (projectId: string, operation: string, reason: string) => 
    emitGovernanceEvent({
      category: "AUTHORIZATION_FAILURE",
      severity: "warning",
      sourceLayer: "AUTH_Z_ENGINE",
      projectId,
      payload: { operation, reason }
    }),

  purityViolation: (projectId: string, operation: string) => 
    emitGovernanceEvent({
      category: "PURITY_VIOLATION",
      severity: "critical",
      sourceLayer: "MUTATION_INTERCEPTOR",
      projectId,
      payload: { operation }
    })
};
