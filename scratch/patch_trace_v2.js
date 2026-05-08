
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'lib', 'data.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Undo the bad patch in getDashboardProjects
const badPatch = 'const admin = createAdminClient();\\n    console.log("[Data] Workspace: Fetching base data for project:", projectId);';
// Since I used backticks and template literals in the script, the content in the file might be slightly different.
// I'll just look for the log string.
const logStr = 'console.log("[Data] Workspace: Fetching base data for project:", projectId);';
if (content.includes(logStr)) {
    // Revert the whole block if possible, or just replace the bad log
    content = content.replace(logStr, 'console.log("[Data] Trace: Fetching base data...");');
    // And fix the projectId usage if it's there
    content = content.replace(/projectId\)/g, 'project.id)');
}

// 2. Patch getProjectWorkspace SPECIFICALLY
// Find the line 'export async function getProjectWorkspace(projectId: string) {'
// Then find the 'const admin = createAdminClient();' AFTER it.

const startMarker = 'export async function getProjectWorkspace(projectId: string) {';
const startIndex = content.indexOf(startMarker);

if (startIndex !== -1) {
    const adminMarker = 'const admin = createAdminClient();';
    const adminIndex = content.indexOf(adminMarker, startIndex);
    
    if (adminIndex !== -1) {
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

        // Find the original Promise.all block starting from adminIndex
        const originalBlockStart = content.indexOf('const [{ data: project }', adminIndex);
        const originalBlockEnd = content.indexOf(']);', originalBlockStart) + 3;
        
        if (originalBlockStart !== -1 && originalBlockEnd !== -1) {
            content = content.substring(0, adminIndex) + replacement + content.substring(originalBlockEnd);
            fs.writeFileSync(filePath, content);
            console.log('Successfully patched getProjectWorkspace with TRACE LOGS');
        } else {
            console.error('Could not find original Promise.all block in getProjectWorkspace');
        }
    } else {
        console.error('Could not find admin client creation in getProjectWorkspace');
    }
} else {
    console.error('Could not find getProjectWorkspace function');
}
