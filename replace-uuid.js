const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== '.next' && f !== 'dist' && f !== '.git' && f !== 'build') {
        walk(dirPath, callback);
      }
    } else {
      if (dirPath.endsWith('.ts') || dirPath.endsWith('.tsx') || dirPath.endsWith('.js') || dirPath.endsWith('.jsx')) {
        callback(dirPath);
      }
    }
  });
}

const dirs = [
  path.join(__dirname, 'apps/tracknov-web'),
  path.join(__dirname, 'packages/core'),
  path.join(__dirname, 'packages/harita-engine'),
  path.join(__dirname, 'packages/ui')
];

let replacedFiles = 0;
let replacedCount = 0;

dirs.forEach(d => {
  walk(d, (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('crypto.randomUUID()')) {
      content = content.replace(/crypto\.randomUUID\(\)/g, 'uuidv4()');
      
      // add import if not there
      if (!content.includes('uuidv4')) {
         // Should not happen since we just replaced it
      }
      
      if (!content.includes('import { v4 as uuidv4 }')) {
        const lines = content.split('\n');
        // Find the position after the last import statement, or top of file
        let insertIndex = 0;
        
        // Let's just put it at the very top (after any "use client" or "use server" if present)
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('"use client"') || lines[i].includes("'use client'") || lines[i].includes('"use server"') || lines[i].includes("'use server'")) {
            insertIndex = i + 1;
            break;
          }
        }
        
        lines.splice(insertIndex, 0, 'import { v4 as uuidv4 } from "uuid";');
        content = lines.join('\n');
      }
      
      fs.writeFileSync(filePath, content);
      console.log('Replaced in', filePath);
      replacedFiles++;
      replacedCount += (content.match(/uuidv4\(\)/g) || []).length;
    }
  });
});

console.log(`Replaced ${replacedCount} occurrences in ${replacedFiles} files.`);
