const fs = require('fs');
const path = 'apps/tracknov-web/components/assistant/global-harita.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add state variable instead of refs
content = content.replace(
  /const desktopInputRef = useRef<HTMLTextAreaElement>\(null\);\n\s*const mobileInputRef = useRef<HTMLTextAreaElement>\(null\);/,
  'const [inputValue, setInputValue] = useState("");'
);

// 2. Replace manual value resets in sendPrompt and clearHistory
content = content.replace(/if \(desktopInputRef\.current\) desktopInputRef\.current\.value = "";\n\s*if \(mobileInputRef\.current\) mobileInputRef\.current\.value = "";/g, 'setInputValue("");');

// 3. Replace onSubmit logic (which is dead code anyway, but just in case)
content = content.replace(/const val = desktopInputRef\.current\?\.value \|\| mobileInputRef\.current\?\.value;\n\s*if \(val\) \{\n\s*void sendPrompt\(val\);\n\s*\}/g, 'if (inputValue.trim()) { void sendPrompt(inputValue); }');

// 4. Update the Textarea components
// Desktop
content = content.replace(
  /<Textarea\n\s*defaultValue="" ref=\{desktopInputRef\}\n\s*onKeyDown=\{\(event\) => \{\n\s*if \(event\.key === "Enter" && !event\.shiftKey\) \{\n\s*event\.preventDefault\(\);\n\s*void sendPrompt\(event\.currentTarget\.value\);\n\s*\}\n\s*\}\}/,
  `<Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendPrompt(inputValue);
                    }
                  }}`
);

// Mobile
content = content.replace(
  /<Textarea\n\s*defaultValue=""\n\s*ref=\{mobileInputRef\}\n\s*onKeyDown=\{\(event\) => \{\n\s*if \(event\.key === "Enter" && !event\.shiftKey\) \{\n\s*event\.preventDefault\(\);\n\s*void sendPrompt\(event\.currentTarget\.value\);\n\s*\}\n\s*\}\}/,
  `<Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendPrompt(inputValue);
                    }
                  }}`
);

// 5. Update the Button click handlers
// Desktop
content = content.replace(
  /<Button type="button" onClick=\{\(\) => desktopInputRef\.current && sendPrompt\(desktopInputRef\.current\.value\)\} className="h-10 rounded-full px-4" disabled=\{loading\}>/,
  '<Button type="button" onClick={() => sendPrompt(inputValue)} className="h-10 rounded-full px-4" disabled={loading}>'
);
// Mobile
content = content.replace(
  /<Button type="button" onClick=\{\(\) => mobileInputRef\.current && sendPrompt\(mobileInputRef\.current\.value\)\} className="h-10 rounded-full px-4" disabled=\{loading\}>/,
  '<Button type="button" onClick={() => sendPrompt(inputValue)} className="h-10 rounded-full px-4" disabled={loading}>'
);

// 6. Update userGoal in assistFormFill
content = content.replace(
  /const userGoal = \(desktopInputRef\.current\?\.value\?\.trim\(\) \|\| mobileInputRef\.current\?\.value\?\.trim\(\)\) \|\| "Fill this form with sensible values based on current page context\.";/,
  'const userGoal = inputValue.trim() || "Fill this form with sensible values based on current page context.";'
);

fs.writeFileSync(path, content);
console.log('Converted to controlled component.');
