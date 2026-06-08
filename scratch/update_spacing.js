const fs = require('fs');

function updateFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Ensure remarkBreaks is imported
  if (!content.includes('import remarkBreaks')) {
    content = content.replace('import remarkGfm from "remark-gfm";', 'import remarkGfm from "remark-gfm";\nimport remarkBreaks from "remark-breaks";');
  }

  // Define the new classes and plugins
  const newClasses = 'prose prose-sm max-w-none break-words leading-relaxed [&>p]:mb-3 [&>p]:last:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ul>li]:mb-1 [&>ul]:mb-3 [&>ul]:last:mb-0 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol>li]:mb-1 [&>ol]:mb-3 [&>ol]:last:mb-0 [&>h1]:font-bold [&>h1]:mb-2 [&>h2]:font-bold [&>h2]:mb-2 [&>h3]:font-bold [&>h3]:mb-2 [&>pre]:bg-[var(--color-surface-2)] [&>pre]:p-2 [&>pre]:rounded-md [&>code]:bg-[var(--color-surface-2)] [&>code]:px-1 [&>code]:rounded [&>strong]:font-bold [&>strong]:text-[var(--color-text-primary)] text-inherit';

  // regex to find the old div and replace with new one
  const regex = /<div className="prose prose-sm max-w-none break-words[^>]+><ReactMarkdown remarkPlugins={\[remarkGfm\]}>\{message\.content\}<\/ReactMarkdown><\/div>/g;
  
  content = content.replace(regex, `<div className="${newClasses}"><ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{message.content}</ReactMarkdown></div>`);

  fs.writeFileSync(file, content);
}

updateFile('apps/tracknov-web/components/assistant/global-harita.tsx');
updateFile('apps/tracknov-web/components/assistant/ai-guide-panel.tsx');
