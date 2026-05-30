import { createAdminClient } from "@/lib/supabase/admin";
import { eventBus } from "@/lib/events/event-bus";

type EvidenceChangeParams = {
  projectId: string;
  documentId: string;
  submittalId?: string | null;
  actorId: string;
  reason?: string | null;
};

/**
 * Dependency invalidation contract:
 * - invalidate downstream review/approval authority
 * - enqueue revalidation in DB
 * - emit immutable audit event
 */
export async function invalidateDependenciesOnEvidenceChange(params: EvidenceChangeParams): Promise<void> {
  const admin = createAdminClient();

  await admin.from("validation_results").update({
    status: "invalidated",
    details: {
      reason: params.reason ?? "Evidence changed",
      document_id: params.documentId,
    },
  }).eq("project_id", params.projectId).neq("status", "invalidated");

  await admin.from("recalculation_queue").insert({
    project_id: params.projectId,
    job_type: "revalidation",
    status: "queued",
    payload: {
      document_id: params.documentId,
      submittal_id: params.submittalId ?? null,
      reason: params.reason ?? "Evidence changed",
    },
  });

  await eventBus.emit({
    type: "DOCUMENT_METADATA_UPDATED",
    payload: {
      documentId: params.documentId,
      projectId: params.projectId,
      userId: params.actorId,
    },
  });
}
