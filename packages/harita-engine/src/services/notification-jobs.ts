import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { notifyUsers } from "@tracknov/harita-engine/services/notification-service";

export async function runNotificationDigestJobs() {
  if (!env.supabaseServiceRoleKey) {
    return { ok: false as const, error: "Service role key is required for digest jobs." };
  }
  const admin = createAdminClient();

  const runStart = await admin
    .from("notification_digest_runs")
    .insert({ run_type: "weekly_digest", status: "running" })
    .select("id")
    .single();
  const runId = runStart.data?.id as string | undefined;

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: projects }, { data: pendingDocs }, { data: inactiveDocs }] = await Promise.all([
      admin.from("projects").select("id, name"),
      admin
        .from("project_document")
        .select("id, project_id, state, uploaded_at")
        .in("state", ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"])
        .gte("uploaded_at", sevenDaysAgo),
      admin
        .from("project_document")
        .select("id, project_id, state, uploaded_at")
        .in("state", ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"])
        .lt("uploaded_at", fiveDaysAgo),
    ]);

    const projectNames = new Map((projects ?? []).map((project: any) => [project.id, project.name]));
    const groupedByProject = new Map<string, number>();
    for (const doc of pendingDocs ?? []) {
      groupedByProject.set(doc.project_id, (groupedByProject.get(doc.project_id) ?? 0) + 1);
    }

    let created = 0;
    for (const [projectId, count] of groupedByProject.entries()) {
      const targetUsers = await admin
        .from("project_users")
        .select("user_id")
        .eq("project_id", projectId)
        .in("role", ["owner", "project_admin", "super_admin", "super_user"]);
      const userIds = (targetUsers.data ?? []).map((row: any) => row.user_id).filter(Boolean);
      if (!userIds.length) continue;
      await notifyUsers(admin as any, {
        projectId,
        userIds,
        body: `Weekly digest: ${count} document(s) are pending review in ${projectNames.get(projectId) ?? "your project"}.`,
        actionUrl: `/review-queue?project=${projectId}`,
      });
      created += userIds.length;
    }

    for (const doc of inactiveDocs ?? []) {
      const targetUsers = await admin
        .from("project_users")
        .select("user_id")
        .eq("project_id", doc.project_id)
        .in("role", ["owner", "project_admin", "super_admin", "super_user"]);
      const userIds = (targetUsers.data ?? []).map((row: any) => row.user_id).filter(Boolean);
      if (!userIds.length) continue;
      await notifyUsers(admin as any, {
        projectId: doc.project_id,
        documentId: doc.id,
        userIds,
        body: `Reminder: a document has been waiting in review for over 5 days in ${projectNames.get(doc.project_id) ?? "your project"}.`,
        actionUrl: `/review-queue?project=${doc.project_id}&document=${doc.id}`,
      });
      created += userIds.length;
    }

    if (runId) {
      await admin
        .from("notification_digest_runs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          records_created: created,
        })
        .eq("id", runId);
    }

    return { ok: true as const, recordsCreated: created };
  } catch (error: any) {
    if (runId) {
      await admin
        .from("notification_digest_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error: String(error?.message ?? "Digest job failed"),
        })
        .eq("id", runId);
    }
    return { ok: false as const, error: String(error?.message ?? "Digest job failed") };
  }
}
