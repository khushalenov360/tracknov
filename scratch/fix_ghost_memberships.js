
import fs from 'fs';

const filePath = 'c:\\Users\\91922\\Documents\\Codex\\2026-04-23-can-you-read-https-github-com\\harita\\lib\\data.ts';
let content = fs.readFileSync(filePath, 'utf8');

const targetLine = `  const projects = memberships ?? [];`;
const replacementLine = `  const projects = (memberships ?? []).filter(m => m && m.project_id && m.projects);`;

content = content.replace(targetLine, replacementLine);

fs.writeFileSync(filePath, content);
console.log("Ghost record filter applied to lib/data.ts");
