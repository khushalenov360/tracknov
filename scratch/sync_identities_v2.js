
import fs from 'fs';

const filePath = 'c:\\Users\\91922\\Documents\\Codex\\2026-04-23-can-you-read-https-github-com\\harita\\lib\\data.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Find the mapping lines and replace them
const mappingPattern = /email:\s*profile\?\.email\s*\?\?\s*row\.user_id,\s*full_name:\s*profile\?\.full_name\s*\?\?\s*"Project member",\s*company:\s*profile\?\.company\s*\?\?\s*null,/g;

const replacement = `email: profile?.email ?? (row.profiles?.email) ?? row.user_id,
        full_name: profile?.full_name ?? (row.profiles?.full_name) ?? "Project member",
        company: profile?.company ?? (row.profiles?.company) ?? null,`;

content = content.replace(mappingPattern, replacement);

// Also ensure all project_users selects have the profiles join
content = content.replace(
  /\.from\("project_users"\)\s*\.select\("id, project_id, user_id, role, created_at, projects\(name\)"\)/g,
  `.from("project_users").select("id, project_id, user_id, role, created_at, projects(name), profiles(email, full_name, company)")`
);

fs.writeFileSync(filePath, content);
console.log("Successfully synchronized all team identity logic.");
