
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'lib', 'data.ts');
let content = fs.readFileSync(filePath, 'utf8');

const target = 'const admin = createAdminClient();';
const replacement = `const admin = createAdminClient();
    console.log("[Data] Workspace: Fetching base data for project:", projectId);
    const [{ data: project }, { data: credits }, { data: documents }, { data: notifications }, { data: activityLogs }, members, invites] =
      await Promise.all([
        (async () => { console.log("[Data] Fetching project..."); return admin.from("projects").select("*").eq("id", projectId).single(); })(),
        (async () => { console.log("[Data] Fetching credits..."); return admin.from("project_credits").select("*").eq("project_id", projectId).order("credit_code"); })(),
        (async () => { console.log("[Data] Fetching documents..."); return admin.from("project_document").select("*").eq("project_id", projectId).order("uploaded_at", { ascending: false }); })(),
        (async () => { console.log("[Data] Fetching notifications..."); return admin.from("notifications").select("id, body, action_url, created_at, read_at").eq("user_id", user.id).eq("project_id", projectId).order("created_at", { ascending: false }); })(),
        (async () => { console.log("[Data] Fetching activity logs..."); return admin.from("system_activity_logs").select("id, project_id, entity_type, entity_id, action, actor_id, actor_role, summary, details, created_at").eq("project_id", projectId).order("created_at", { ascending: false }).limit(25); })(),
        (async () => { console.log("[Data] Fetching members..."); return getProjectMembers(admin, projectId); })(),
        (async () => { console.log("[Data] Fetching invites..."); return getProjectInvites(admin, projectId); })(),
      ]);
    console.log("[Data] Workspace: Base data fetch complete.");`;

// We need to replace the original Promise.all as well to avoid duplication
const originalPromiseAll = `const [{ data: project }, { data: credits }, { data: documents }, { data: notifications }, { data: activityLogs }, members, invites] =
      await Promise.all([
        admin.from("projects").select("*").eq("id", projectId).single(),
        admin.from("project_credits").select("*").eq("project_id", projectId).order("credit_code"),
        admin
          .from("project_document")
          .select("*")
          .eq("project_id", projectId)
          .order("uploaded_at", { ascending: false }),
        admin
          .from("notifications")
          .select("id, body, action_url, created_at, read_at")
          .eq("user_id", user.id)
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        admin
          .from("system_activity_logs")
          .select("id, project_id, entity_type, entity_id, action, actor_id, actor_role, summary, details, created_at")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(25),
        getProjectMembers(admin, projectId),
        getProjectInvites(admin, projectId),
      ]);`;

if (content.includes(originalPromiseAll)) {
    content = content.replace(originalPromiseAll, "");
}
if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content);
    console.log('Successfully patched lib/data.ts with TRACE LOGS');
} else {
    console.error('Target not found for TRACE LOGS');
}
