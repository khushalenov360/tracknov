const fs = require('fs');

function updateFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  if (!content.includes('import { memo }')) {
    content = content.replace('import { useEffect, useMemo, useRef, useState } from "react";', 'import { useEffect, useMemo, useRef, useState, memo } from "react";');
  }

  const memoComponent = `
const MemoizedMarkdown = memo(function MemoizedMarkdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none break-words leading-relaxed [&>p]:mb-3 [&>p]:last:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ul>li]:mb-1 [&>ul]:mb-3 [&>ul]:last:mb-0 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol>li]:mb-1 [&>ol]:mb-3 [&>ol]:last:mb-0 [&>h1]:font-bold [&>h1]:mb-2 [&>h2]:font-bold [&>h2]:mb-2 [&>h3]:font-bold [&>h3]:mb-2 [&>pre]:bg-[var(--color-surface-2)] [&>pre]:p-2 [&>pre]:rounded-md [&>code]:bg-[var(--color-surface-2)] [&>code]:px-1 [&>code]:rounded [&>strong]:font-bold [&>strong]:text-[var(--color-text-primary)] text-inherit">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{content}</ReactMarkdown>
    </div>
  );
});
`;

  if (!content.includes('const MemoizedMarkdown = memo')) {
    content = content.replace('import { sessionMemory } from "@tracknov/harita-engine/services/session-memory-service";', 'import { sessionMemory } from "@tracknov/harita-engine/services/session-memory-service";\n' + memoComponent);
  }

  const regex = /<div className="prose prose-sm max-w-none break-words[^>]+><ReactMarkdown remarkPlugins={\[remarkGfm, remarkBreaks\]}>\{message\.content\}<\/ReactMarkdown><\/div>/g;
  
  content = content.replace(regex, '<MemoizedMarkdown content={message.content} />');

  fs.writeFileSync(file, content);
}

updateFile('apps/tracknov-web/components/assistant/global-harita.tsx');
updateFile('apps/tracknov-web/components/assistant/ai-guide-panel.tsx');
