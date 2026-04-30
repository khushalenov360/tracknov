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
  }: {
    projectId: string;
    creditId?: string | null;
    documentId?: string | null;
    userIds: string[];
    body: string;
  },
) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueUserIds.length || !body.trim()) {
    return;
  }
  await writer.from("notifications").insert(
    uniqueUserIds.map((userId) => ({
      project_id: projectId,
      credit_id: creditId ?? null,
      document_id: documentId ?? null,
      user_id: userId,
      body,
    })),
  );
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
