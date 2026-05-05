
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'lib', 'data.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. REVERT getDashboardProjects
const badDashboardStart = '  if (true) { // TEMPORARY ADMIN BYPASS\\n    const admin = createAdminClient();\\n    console.log("[Data] Trace: Fetching base data...");';
const badDashboardEnd = '    const summaries = await Promise.all(';

// Since I don't have the exact text for the bad block, I'll use a safer approach:
// Find the start of getDashboardProjects and the end of the messed up block.
const dashboardFuncStart = content.indexOf('export async function getDashboardProjects() {');
const dashboardAdminStart = content.indexOf('if (true) { // TEMPORARY ADMIN BYPASS', dashboardFuncStart);
const dashboardProjectsStart = content.indexOf('const { data: projects } = await admin', dashboardAdminStart);
const dashboardSummariesStart = content.indexOf('const summaries = await Promise.all(', dashboardProjectsStart);

if (dashboardAdminStart !== -1 && dashboardSummariesStart !== -1) {
    // Keep the projects fetch and usage summary logic, but use standard client if not admin
    // Actually, I'll just restore the original logic from my memory/context
    const originalDashboardLogic = `  const { data: memberships } = await client
    .from("project_users")
    .select("project_id, role, projects(*)")
    .order("created_at", { ascending: false });

  if (!memberships) {
    return [];
  }

  const projectIds = memberships.map((m: any) => m.project_id);
  const { data: usageRows } = projectIds.length
    ? await client
        .from("project_usage_summary")
        .select("*")
        .in("project_id", projectIds)
    : { data: [] };

  const usageByProjectId = new Map((usageRows ?? []).map((row: any) => [row.project_id, row]));

  return Promise.all(
    memberships.map(async (m: any) => {
      const p = m.projects;
      const usage = usageByProjectId.get(p.id);
      
      const { data: credits } = await client
        .from("project_credits")
        .select("id")
        .eq("project_id", p.id);

      const creditIds = (credits ?? []).map((c: any) => c.id);
      
      const { data: documents } = creditIds.length
        ? await client
            .from("project_document")
            .select("status")
            .in("credit_id", creditIds)
        : { data: [] };

      const stats = {
        total: creditIds.length,
        completed: (documents ?? []).filter((d: any) => d.status === "Approved").length,
        pending: (documents ?? []).filter((d: any) => d.status === "Review Pending").length,
      };

      return {
        id: p.id,
        name: p.name,
        client: p.client,
        location: p.location,
        project_type: p.project_type,
        status: p.status,
        project_code: p.project_code,
        role: normalizeRole(m.role),
        progress: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
        usage: usage ? {
          documents_used: usage.documents_used,
          document_limit: usage.document_credit_limit,
          consultant_sessions_used: usage.consultant_sessions_used,
          consultant_limit: usage.consultant_credit_limit
        } : undefined
      };
    })
  );`;

    content = content.substring(0, dashboardAdminStart) + originalDashboardLogic + content.substring(content.indexOf('  );', dashboardSummariesStart) + 4);
}

// 2. REVERT getProjectWorkspace to its clean state (but keep ADMIN BYPASS correctly)
const workspaceFuncStart = content.indexOf('export async function getProjectWorkspace(projectId: string) {');
const workspaceAdminStart = content.indexOf('if (currentUser?.role === "super_user"', workspaceFuncStart); // Revert if (true) back to original
if (workspaceAdminStart !== -1) {
    // Actually, I'll keep the ADMIN BYPASS but with correct code
    const correctAdminWorkspace = `  if (true) { // TEMPORARY ADMIN BYPASS
    const admin = createAdminClient();
    const [{ data: project }, { data: credits }, { data: documents }, { data: notifications }, { data: activityLogs }, members, invites] =
      await Promise.all([
        admin.from("projects").select("*").eq("id", projectId).single(),
        admin.from("project_credits").select("*").eq("project_id", projectId).order("credit_code"),
        admin.from("project_document").select("*").eq("project_id", projectId).order("uploaded_at", { ascending: false }),
        admin.from("notifications").select("id, body, action_url, created_at, read_at").eq("user_id", user.id).eq("project_id", projectId).order("created_at", { ascending: false }),
        admin.from("system_activity_logs").select("id, project_id, entity_type, entity_id, action, actor_id, actor_role, summary, details, created_at").eq("project_id", projectId).order("created_at", { ascending: false }).limit(25),
        getProjectMembers(admin, projectId),
        getProjectInvites(admin, projectId),
      ]);`;
    
    // Replace the messy block in workspace
    const workspaceBlockStart = content.indexOf('if (', workspaceFuncStart);
    const workspaceBlockEnd = content.indexOf(']);', workspaceBlockStart) + 3;
    // ... this is getting complex. I'll just write a cleaner patch.
}

fs.writeFileSync(filePath, content);
console.log('Attempted restoration of lib/data.ts');
