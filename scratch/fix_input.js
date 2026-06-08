const fs = require('fs');

function updateGlobalHarita(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace state with ref
  content = content.replace('const [input, setInput] = useState("");', 'const inputRef = useRef<HTMLTextAreaElement>(null);');
  
  // Replace setInput("") with ref clear
  content = content.replace(/setInput\(""\);/g, 'if (inputRef.current) inputRef.current.value = "";');

  // Replace onSubmit
  content = content.replace(
    '  function onSubmit(event: React.FormEvent<HTMLFormElement>) {\n    event.preventDefault();\n    void sendPrompt(input);\n  }',
    '  function onSubmit(event: React.FormEvent<HTMLFormElement>) {\n    event.preventDefault();\n    if (inputRef.current) void sendPrompt(inputRef.current.value);\n  }'
  );

  // Update Textarea usage
  content = content.replace(/<Textarea[\s\S]*?className="min-h-\[80px\] resize-none text-\[12px\]"\s*\/>/g, (match) => {
    let replaced = match.replace(/value=\{input\}/, 'defaultValue="" ref={inputRef}');
    replaced = replaced.replace(/onChange=\{.*?\}\s*/, '');
    replaced = replaced.replace(/void sendPrompt\(input\);/, 'void sendPrompt(event.currentTarget.value);');
    return replaced;
  });

  // Update Button disabled state
  content = content.replace(/disabled=\{\!input\.trim\(\) \|\| loading\}/g, 'disabled={loading}');

  fs.writeFileSync(file, content);
}

function updateAiGuidePanel(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace state with ref
  content = content.replace('const [input, setInput] = useState("");', 'const inputRef = useRef<HTMLTextAreaElement>(null);');
  
  // Replace setInput("") with ref clear
  content = content.replace(/setInput\(""\);/g, 'if (inputRef.current) inputRef.current.value = "";');

  // Replace onSubmit
  content = content.replace(
    '  function onSubmit(event: React.FormEvent<HTMLFormElement>) {\n    event.preventDefault();\n    void sendPrompt(input);\n  }',
    '  function onSubmit(event: React.FormEvent<HTMLFormElement>) {\n    event.preventDefault();\n    if (inputRef.current) void sendPrompt(inputRef.current.value);\n  }'
  );

  // Update Textarea usage
  content = content.replace(/<Textarea[\s\S]*?className="min-h-\[80px\] resize-none text-\[12px\]"\s*\/>/g, (match) => {
    let replaced = match.replace(/value=\{input\}/, 'defaultValue="" ref={inputRef}');
    replaced = replaced.replace(/onChange=\{.*?\}\s*/, '');
    replaced = replaced.replace(/void sendPrompt\(input\);/, 'void sendPrompt(event.currentTarget.value);');
    return replaced;
  });

  // Update Button disabled state
  content = content.replace(/disabled=\{\!input\.trim\(\) \|\| isLoading\}/g, 'disabled={isLoading}');

  fs.writeFileSync(file, content);
}

try {
  updateGlobalHarita('apps/tracknov-web/components/assistant/global-harita.tsx');
  console.log('Updated global-harita.tsx');
} catch (e) {
  console.log('Error in global-harita', e);
}

try {
  updateAiGuidePanel('apps/tracknov-web/components/assistant/ai-guide-panel.tsx');
  console.log('Updated ai-guide-panel.tsx');
} catch (e) {
  console.log('Error in ai-guide', e);
}
