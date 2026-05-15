import { createAdminClient } from "@/lib/supabase/admin";
import { governanceLocalStorage } from "./governanceContext";
import { emitGovernanceEvent } from "./governanceObservabilityBus";

export type GovernanceIncidentType = 
  | 'replay_conflict'
  | 'stale_approval_attempt'
  | 'override_abuse_attempt'
  | 'tenant_boundary_violation'
  | 'replay_hash_mismatch'
  | 'drift_detection_failure'
  | 'runtime_entropy_warning';

export interface GovernanceIncidentParams {
  type: GovernanceIncidentType;
  severity: "info" | "warning" | "critical";
  projectId: string;
  replayContext?: Record<string, any>;
  actorId?: string;
  resolutionNotes?: string;
}

/**
 * Enterprise Governance Incident Engine.
 * Formally registers and tracks governance-critical failures and anomalies.
 */
export async function reportGovernanceIncident(params: GovernanceIncidentParams): Promise<string> {
  const context = governanceLocalStorage.getStore();
  const traceId = context?.traceId;
  const actorId = params.actorId || context?.actorId;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("governance_incidents")
    .insert({
      incident_type: params.type,
      severity: params.severity,
      project_id: params.projectId,
      trace_id: traceId,
      actor_id: actorId,
      replay_context: params.replayContext || {},
      resolution_status: "open",
      resolution_notes: params.resolutionNotes
    })
    .select("incident_id")
    .single();

  if (error) {
    console.error("[GOVERNANCE_INCIDENT_ERROR] Failed to record incident:", error);
    // We still emit an observability event even if persistence fails
  }

  // Also emit to the observability bus for real-time alerting
  await emitGovernanceEvent({
    category: `INCIDENT_${params.type.toUpperCase()}`,
    severity: params.severity,
    sourceLayer: "INCIDENT_ENGINE",
    projectId: params.projectId,
    payload: {
      incidentId: data?.incident_id,
      incidentType: params.type,
      ...params.replayContext
    }
  });

  return data?.incident_id || "FAILED_TO_PERSIST";
}

export const governanceIncidents = {
  replayConflict: (projectId: string, replayContext: any) =>
    reportGovernanceIncident({
      type: "replay_conflict",
      severity: "warning",
      projectId,
      replayContext
    }),

  staleApproval: (projectId: string, actorId: string) =>
    reportGovernanceIncident({
      type: "stale_approval_attempt",
      severity: "warning",
      projectId,
      actorId
    }),

  overrideAbuse: (projectId: string, actorId: string, replayContext: any) =>
    reportGovernanceIncident({
      type: "override_abuse_attempt",
      severity: "critical",
      projectId,
      actorId,
      replayContext
    }),

  tenantViolation: (projectId: string, actorId: string, attemptedAccess: string) =>
    reportGovernanceIncident({
      type: "tenant_boundary_violation",
      severity: "critical",
      projectId,
      actorId,
      replayContext: { attemptedAccess }
    }),

  hashMismatch: (projectId: string, replayContext: any) =>
    reportGovernanceIncident({
      type: "replay_hash_mismatch",
      severity: "critical",
      projectId,
      replayContext
    }),

  driftFailure: (projectId: string, error: string) =>
    reportGovernanceIncident({
      type: "drift_detection_failure",
      severity: "warning",
      projectId,
      replayContext: { error }
    }),

  entropyWarning: (projectId: string, metrics: any) =>
    reportGovernanceIncident({
      type: "runtime_entropy_warning",
      severity: "warning",
      projectId,
      replayContext: { metrics }
    })
};
