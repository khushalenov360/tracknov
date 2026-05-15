import { createAdminClient } from "@/lib/supabase/admin";
import { emitGovernanceEvent } from "./governanceObservabilityBus";

export interface ImpactResolution {
  invalidatedEntities: string[];
  reconciliationTasksGenerated: number;
  certificationImpacted: boolean;
}

/**
 * Resolves the impact of evidence changes on downstream derived states and certifications.
 */
export async function resolveReplayImpact(
  projectId: string,
  changedEntityId: string,
  entityType: "evidence" | "scoring" | "credit"
): Promise<ImpactResolution> {
  const admin = createAdminClient();
  const invalidated: string[] = [];
  let certImpacted = false;

  // 1. Invalidate Derived State (Marks for recalculation)
  const { error: recalcError } = await admin
    .from("recalculation_queue")
    .insert({
      project_id: projectId,
      entity_type: entityType,
      entity_id: changedEntityId,
      status: "PENDING",
      reason: "REPLAY_SENSITIVE_CHANGE"
    });

  if (recalcError) {
    console.error("Failed to queue recalculation:", recalcError);
  }

  // 2. Check for Certification Impact
  const { data: project } = await admin
    .from("projects")
    .select("status")
    .eq("id", projectId)
    .single();

  if (project?.status === "CERTIFIED" || project?.status === "LOCKED") {
    certImpacted = true;
    invalidated.push(`CERTIFICATION_${projectId}`);
    
    // Log critical governance event
    await emitGovernanceEvent({
      category: "CERTIFICATION_INVALIDATION",
      severity: "critical",
      sourceLayer: "replayImpactResolver",
      projectId,
      payload: { changedEntityId, entityType }
    });
  }

  // 3. Invalidate downstream approvals (Logic would be more complex in production)
  // Placeholder: find submittals dependent on this evidence
  invalidated.push(`DERIVED_STATE_${changedEntityId}`);

  return {
    invalidatedEntities: invalidated,
    reconciliationTasksGenerated: 1, // At least the recalculation queue entry
    certificationImpacted: certImpacted,
  };
}
