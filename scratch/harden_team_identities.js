
import fs from 'fs';

const filePath = 'c:\\Users\\91922\\Documents\\Codex\\2026-04-23-can-you-read-https-github-com\\harita\\lib\\data.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Use a more robust join/mapping in getTeamMembers
const target = `      grouped.set(row.user_id, {
        id: row.id,
        user_id: row.user_id,
        email: profile?.email ?? row.user_id,
        full_name: profile?.full_name ?? "Project member",
        company: profile?.company ?? null,
        role: normalizeRole(profile?.global_role ?? row.role),`;

const replacement = `      grouped.set(row.user_id, {
        id: row.id,
        user_id: row.user_id,
        email: profile?.email ?? (row.profiles?.email) ?? row.user_id,
        full_name: profile?.full_name ?? (row.profiles?.full_name) ?? "Project member",
        company: profile?.company ?? (row.profiles?.company) ?? null,
        role: normalizeRole(profile?.global_role ?? row.role),`;

content = content.replace(target, replacement);

// Also update the select to include profiles join for safety
content = content.replace(`.select("id, project_id, user_id, role, created_at, projects(name)")`, `.select("id, project_id, user_id, role, created_at, projects(name), profiles(email, full_name, company)")`);

fs.writeFileSync(filePath, content);
console.log("Team identity link hardened in lib/data.ts");
