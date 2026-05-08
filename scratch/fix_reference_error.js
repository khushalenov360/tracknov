
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'lib', 'data.ts');
let content = fs.readFileSync(filePath, 'utf8');

const target = 'console.log(">>> [Data] ENTERING ADMIN BYPASS FOR PROJECT:", projectId);';
const replacement = 'console.log(">>> [Data] ENTERING ADMIN BYPASS FOR ALL PROJECTS");';

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content);
  console.log('Successfully fixed the ReferenceError in lib/data.ts');
} else {
  console.error('Target not found for fix');
}
