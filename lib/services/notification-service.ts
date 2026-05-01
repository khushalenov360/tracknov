type WriterClient = {
  from: (table: string) => any;
};

export async function notifyUsers(
  writer: WriterClient,
  {
    projectId,
    creditId,
    documentId,
    userIds,
    body,
    actionUrl,
  }: {
    projectId: string;
    creditId?: string | null;
    documentId?: string | null;
    userIds: string[];
    body: string;
    actionUrl?: string | null;
  },
) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueUserIds.length || !body.trim()) {
    return;
  }
  const rows = uniqueUserIds.map((userId) => ({
    project_id: projectId,
    credit_id: creditId ?? null,
    document_id: documentId ?? null,
    user_id: userId,
    body,
    action_url: actionUrl ?? null,
  }));
  await writer.from("notifications").insert(rows);

  const { data: recipients } = await writer
    .from("profiles")
    .select("user_id, email")
    .in("user_id", uniqueUserIds);

  const outboxRows = (recipients ?? [])
    .filter((recipient: any) => Boolean(recipient.email))
    .map((recipient: any) => ({
      user_id: recipient.user_id,
      project_id: projectId,
      document_id: documentId ?? null,
      channel: "email",
      recipient: String(recipient.email),
      subject: "Tracknov notification",
      body,
      action_url: actionUrl ?? null,
      status: "queued",
    }));
  if (outboxRows.length) {
    await writer.from("notification_outbox").insert(outboxRows);
  }
}

export async function getProjectMembersByRoles(
  writer: WriterClient,
  projectId: string,
  roles: string[],
) {
  const { data } = await writer
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId)
    .in("role", roles);
  return (data ?? []).map((row: { user_id: string }) => row.user_id).filter(Boolean) as string[];
}
