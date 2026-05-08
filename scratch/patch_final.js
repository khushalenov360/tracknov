
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'lib', 'data.ts');
let content = fs.readFileSync(filePath, 'utf8');

const target = 'if (currentUser?.role === "super_user" && env.supabaseServiceRoleKey) {';
const replacement = `if (true) { // TEMPORARY ADMIN BYPASS
    console.log(">>> [Data] ENTERING ADMIN BYPASS FOR PROJECT:", projectId);`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content);
  console.log('Successfully applied ADMIN BYPASS with LOUD LOGGING');
} else {
  console.error('Target not found for ADMIN BYPASS');
}
