import { createAdminClient } from "../supabase/admin";
import { governanceLocalStorage } from "../governance/governanceContext";

/**
 * TRACKNOV AI RUNTIME AUDIT LOGGER
 * 
 * Ensures all AI interactions are recorded in an immutable ledger
 * with full causality tracing.
 */
export async function logAiRecommendation(params: {
  projectId: string;
  recommendationType: string;
  payload: any;
  reasoning?: string;
}) {
  const admin = createAdminClient();
  const context = (governanceLocalStorage as any).getStore();

  const traceId = context?.traceId || crypto.randomUUID();
  const causalityChainId = context?.causalityChainId || traceId;
  const actorId = context?.actorId;
  const frameworkVersion = context?.frameworkVersion || "UNKNOWN";
  const replayMode = context?.replayMode || false;

  if (replayMode) {
    console.log(`[AI_REPLAY_ISOLATION] Skipping DB audit log during replay mode. Trace: ${traceId}`);
    return { traceId, causalityChainId };
  }

  const { error } = await admin.from("ai_recommendation_logs").insert({
    project_id: params.projectId,
    actor_id: actorId,
    recommendation_type: params.recommendationType,
    payload: params.payload,
    reasoning: params.reasoning,
    trace_id: traceId,
    causality_chain_id: causalityChainId,
    framework_version: frameworkVersion
  });

  if (error) {
    console.error(`[AI_AUDIT_FAILURE] Failed to log AI recommendation:`, error.message);
    // In a high-integrity system, we might throw here to block the non-audited action
    throw new Error(`AI_AUDIT_INTEGRITY_VIOLATION: ${error.message}`);
  }

  return { traceId, causalityChainId };
}

export async function logAiRiskReport(params: {
  projectId: string;
  riskScore: number;
  riskFactors: any[];
  mitigationRecommendations?: string;
}) {
  const admin = createAdminClient();
  const context = (governanceLocalStorage as any).getStore();

  const traceId = context?.traceId || crypto.randomUUID();
  const causalityChainId = context?.causalityChainId || traceId;
  const replayMode = context?.replayMode || false;

  if (replayMode) {
    console.log(`[AI_REPLAY_ISOLATION] Skipping risk report mutation during replay mode. Trace: ${traceId}`);
    return;
  }

  const { error } = await admin.from("ai_execution_risk_reports").insert({
    project_id: params.projectId,
    risk_score: params.riskScore,
    risk_factors: params.riskFactors,
    mitigation_recommendations: params.mitigationRecommendations,
    trace_id: traceId,
    causality_chain_id: causalityChainId
  });

  if (error) {
    throw new Error(`AI_AUDIT_INTEGRITY_VIOLATION: ${error.message}`);
  }
}
