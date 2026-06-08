const fs = require('fs');

function updateFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  const oldStreamCode = `
      let assistantText = "";
      await readStream(response, (chunk) => {
        assistantText += chunk;
        setMessages((current) => {
          const copy = [...current];
          copy[copy.length - 1] = { role: "assistant", content: assistantText };
          return copy;
        });
      });
`;

  const newStreamCode = `
      let assistantText = "";
      let lastRenderTime = Date.now();
      
      await readStream(response, (chunk) => {
        assistantText += chunk;
        const now = Date.now();
        if (now - lastRenderTime > 40) {
          setMessages((current) => {
            const copy = [...current];
            copy[copy.length - 1] = { role: "assistant", content: assistantText };
            return copy;
          });
          lastRenderTime = now;
        }
      });
      
      // Final flush
      setMessages((current) => {
        const copy = [...current];
        copy[copy.length - 1] = { role: "assistant", content: assistantText };
        return copy;
      });
`;

  content = content.replace(oldStreamCode.trim(), newStreamCode.trim());

  fs.writeFileSync(file, content);
}

try {
  updateFile('apps/tracknov-web/components/assistant/global-harita.tsx');
  console.log('Updated global-harita.tsx');
} catch (e) {
  console.log(e);
}

try {
  updateFile('apps/tracknov-web/components/assistant/ai-guide-panel.tsx');
  console.log('Updated ai-guide-panel.tsx');
} catch (e) {
  console.log(e);
}
