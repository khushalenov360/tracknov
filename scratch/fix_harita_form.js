const fs = require('fs');
const path = 'apps/tracknov-web/components/assistant/global-harita.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/const inputRef = useRef<HTMLTextAreaElement>\(null\);/g, 'const desktopInputRef = useRef<HTMLTextAreaElement>(null);\n  const mobileInputRef = useRef<HTMLTextAreaElement>(null);');

content = content.replace(/if \(inputRef\.current\) inputRef\.current\.value = "";/g, 'if (desktopInputRef.current) desktopInputRef.current.value = "";\n    if (mobileInputRef.current) mobileInputRef.current.value = "";');

content = content.replace(/if \(inputRef\.current\) \{\n\s*void sendPrompt\(inputRef\.current\.value\);\n\s*\}/g, 'const val = desktopInputRef.current?.value || mobileInputRef.current?.value;\n    if (val) {\n      void sendPrompt(val);\n    }');

content = content.replace(/ref=\{inputRef\}/, 'ref={desktopInputRef}');
content = content.replace(/ref=\{inputRef\}/, 'ref={mobileInputRef}');

content = content.replace(/<form onSubmit=\{onSubmit\} className="space-y-2">/g, '<div className="space-y-2">');
content = content.replace(/<\/form>/g, '</div>');

content = content.replace(
  /<Button type="submit" className="h-10 rounded-full px-4" disabled=\{loading\}>/,
  '<Button type="button" onClick={() => desktopInputRef.current && sendPrompt(desktopInputRef.current.value)} className="h-10 rounded-full px-4" disabled={loading}>'
);

content = content.replace(
  /<Button type="submit" className="h-10 rounded-full px-4" disabled=\{loading\}>/,
  '<Button type="button" onClick={() => mobileInputRef.current && sendPrompt(mobileInputRef.current.value)} className="h-10 rounded-full px-4" disabled={loading}>'
);

content = content.replace(/inputRef\.current\?\.value\?\.trim\(\)/g, '(desktopInputRef.current?.value?.trim() || mobileInputRef.current?.value?.trim())');

fs.writeFileSync(path, content);
console.log('Fixed refs and form tags.');
