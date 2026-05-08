type WriterClient = {
  from: (table: string) => any;
};

export async function logDocumentActivity(
  writer: WriterClient,
  {
    documentId,
    projectId,
    action,
    actorId,
    actorRole,
    summary,
    details = {},
  }: {
    documentId?: string | null;
    projectId: string;
    action: "uploaded" | "metadata_updated" | "status_updated" | "deleted";
    actorId?: string | null;
    actorRole?: string | null;
    summary: string;
    details?: Record<string, unknown>;
  },
) {
  await writer.from("document_activity_logs").insert({
    document_id: documentId ?? null,
    project_id: projectId,
    action,
    actor_id: actorId ?? null,
    actor_role: actorRole ?? null,
    summary,
    details,
  });
}

export async function logSystemActivity(
  writer: WriterClient,
  {
    projectId,
    entityType,
    entityId,
    action,
    actorId,
    actorRole,
    summary,
    details = {},
  }: {
    projectId?: string | null;
    entityType: "project" | "credit" | "document" | "team" | "billing" | "auth";
    entityId?: string | null;
    action: string;
    actorId?: string | null;
    actorRole?: string | null;
    summary: string;
    details?: Record<string, unknown>;
  },
) {
  await writer.from("system_activity_logs").insert({
    project_id: projectId ?? null,
    entity_type: entityType,
    entity_id: entityId ?? null,
    action,
    actor_id: actorId ?? null,
    actor_role: actorRole ?? null,
    summary,
    details,
  });
}
