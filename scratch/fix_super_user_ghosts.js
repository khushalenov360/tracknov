
import fs from 'fs';

const filePath = 'c:\\Users\\91922\\Documents\\Codex\\2026-04-23-can-you-read-https-github-com\\harita\\lib\\data.ts';
let content = fs.readFileSync(filePath, 'utf8');

const targetLine = `    const projects = memberships ?? [];`;
const replacementLine = `    const projects = (memberships ?? []).filter(m => m && m.project_id && m.projects);`;

// Use replace with a bit more context for the super user block
content = content.replace('const { data: memberships } = await admin.from("project_users").select("project_id, role, projects(*)");\n    const projects = memberships ?? [];', 'const { data: memberships } = await admin.from("project_users").select("project_id, role, projects(*)");\n    const projects = (memberships ?? []).filter(m => m && m.project_id && m.projects);');

fs.writeFileSync(filePath, content);
console.log("Ghost record filter applied to Super User block in lib/data.ts");
