const fs = require('fs');

function updateFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(/bottomRef\.current\?\.scrollIntoView\(\{ behavior: "smooth", block: "end" \}\);/g, 'bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });');

  fs.writeFileSync(file, content);
}

updateFile('apps/tracknov-web/components/assistant/global-harita.tsx');
updateFile('apps/tracknov-web/components/assistant/ai-guide-panel.tsx');
