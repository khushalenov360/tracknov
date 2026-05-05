
import fs from 'fs';

const filePath = 'c:\\Users\\91922\\Documents\\Codex\\2026-04-23-can-you-read-https-github-com\\harita\\lib\\data.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace both occurrences of the bare return
content = content.replace(/return summaries;/g, 'return (summaries as any[]).filter(Boolean);');

fs.writeFileSync(filePath, content);
console.log("Global null filters applied to lib/data.ts");
