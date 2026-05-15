import { createAdminClient } from "@/lib/supabase/admin";
import { governanceLocalStorage } from "./governanceContext";
import { calculateGovernanceImpactBlastRadius, type GovernanceImpactResult } from "./impactGraphEngine";
import { executeDeterministicReplay } from "./replayEngine";

export interface OverrideValidationResult {
  reportId: string;
  isSafe: boolean;
  blastRadius: GovernanceImpactResult;
  replayDriftDetected: boolean;
  validationWarnings: string[];
}

/**
 * Override Safety Framework.
 * Enforces mandatory safety checks before any governance override is committed.
 */
export async function validateOverrideSafety(params: {
  projectId: string;
  overrideType: string;
  reason: string;
  actorId: string;
  targetTimestamp: string;
}): Promise<OverrideValidationResult> {
  const admin = createAdminClient();
  const context = governanceLocalStorage.getStore();

  // 1. Mandatory Reason Check
  if (!params.reason || params.reason.length < 20) {
    throw new Error("Override safety violation: Detailed reason (min 20 chars) is required.");
  }

  // 2. Blast-Radius Calculation
  // We simulate the graph nodes for this example, but in production, this would fetch from the dependency resolver
  const blastRadius = calculateGovernanceImpactBlastRadius("OVERRIDE_TARGET", []);

  // 3. Replay Impact Validation
  // We run a test replay to ensure the override doesn't break the deterministic history
  const replayResult = await executeDeterministicReplay(params.projectId, params.targetTimestamp);
  const replayDriftDetected = Object.keys(replayResult.reconstructedState.integrityValidation).length > 0;

  // 4. Create immutable safety report
  const { data: report, error } = await admin
    .from("override_safety_reports")
    .insert({
      project_id: params.projectId,
      override_type: params.overrideType,
      reason: params.reason,
      actor_id: params.actorId,
      blast_radius: blastRadius,
      replay_impact_validation: {
        driftDetected: replayDriftDetected,
        executedAt: replayResult.executedAt,
        contract: replayResult.contract.version
      }
    })
    .select("report_id")
    .single();

  if (error) {
    throw new Error(`Failed to persist override safety report: ${error.message}`);
  }

  return {
    reportId: report.report_id,
    isSafe: !replayDriftDetected && !blastRadius.downgradeRequired,
    blastRadius,
    replayDriftDetected,
    validationWarnings: blastRadius.downgradeRequired ? ["Certification downgrade required"] : []
  };
}

export async function confirmOverride(reportId: string, confirmorId: string): Promise<void> {
  const admin = createAdminClient();
  
  const { error } = await admin
    .from("override_safety_reports")
    .update({
      secondary_confirmation_by: confirmorId,
      secondary_confirmation_at: new Date().toISOString()
    })
    .eq("report_id", reportId);

  if (error) {
    throw new Error(`Failed to confirm override: ${error.message}`);
  }
}
