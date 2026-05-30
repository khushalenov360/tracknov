import { createAdminClient } from "@/lib/supabase/admin";
import { CURRENT_REPLAY_CONTRACT, type ReplayContract } from "./replayContract";

export interface ReplayExecutionResult {
  contract: ReplayContract;
  reconstructedState: {
    metadata: Record<string, unknown>;
    tables: Record<string, unknown>;
    integrityValidation: Record<string, unknown>;
  };
  executedAt: string;
  isSideEffectFree: boolean;
}

/**
 * Mathematically deterministic Replay Engine orchestration layer.
 * Calls execute_audit_replay to retrieve the exact point-in-time database snapshot.
 * Ensures strict runtime isolation, ensuring absolutely no queues/websockets/mutations are emitted.
 */
export async function executeDeterministicReplay(
  projectId: string,
  targetTimestamp: string,
): Promise<ReplayExecutionResult> {
  const admin = createAdminClient();

  // Execute point-in-time pure database reconstruction using the secure, deterministic stored procedure
  const { data, error } = await admin.rpc("execute_audit_replay", {
    p_project_id: projectId,
    p_target_timestamp: targetTimestamp,
  });

  if (error || !data) {
    throw new Error(`Deterministic replay reconstruction failed: ${error?.message || "Empty return from engine"}`);
  }

  // If the stored procedure captured a tenant isolation violation or error, bubble it up securely
  if (data.error) {
    throw new Error(`Replay Access Denied: ${data.message || data.error}`);
  }

  return {
    contract: CURRENT_REPLAY_CONTRACT,
    executedAt: new Date().toISOString(),
    isSideEffectFree: true,
    reconstructedState: {
      integrityValidation: data.integrity_validation || {},
      metadata: data.metadata || {},
      tables: data.tables || {},
    },
  };
}
