
import fs from 'fs';

const filePath = 'c:\\Users\\91922\\Documents\\Codex\\2026-04-23-can-you-read-https-github-com\\harita\\lib\\data.ts';
let content = fs.readFileSync(filePath, 'utf8');

const target = `  return summaries;
}`;

const replacement = `  return (summaries as any[]).filter(Boolean);
}`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content);
    console.log("Final filter applied!");
} else {
    console.log("Target not found!");
}
