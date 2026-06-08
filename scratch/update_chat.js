const fs = require('fs');
const file = 'apps/tracknov-web/components/assistant/global-harita.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('"use client";', '"use client";\n\nimport ReactMarkdown from "react-markdown";\nimport remarkGfm from "remark-gfm";');

content = content.replace(/<p className="whitespace-pre-wrap">\{message\.content\}<\/p>/g, '<div className="prose prose-sm max-w-none break-words [&>p]:mb-2 [&>p]:last:mb-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:mb-2 [&>ul]:last:mb-0 [&>ol]:list-decimal [&>ol]:pl-4 [&>ol]:mb-2 [&>ol]:last:mb-0 [&>h1]:font-bold [&>h2]:font-bold [&>h3]:font-bold [&>pre]:bg-[var(--color-surface-2)] [&>pre]:p-2 [&>pre]:rounded-md [&>code]:bg-[var(--color-surface-2)] [&>code]:px-1 [&>code]:rounded text-inherit"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown></div>');

fs.writeFileSync(file, content);
