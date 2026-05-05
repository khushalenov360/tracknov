
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'lib', 'data.ts');
let content = fs.readFileSync(filePath, 'utf8');

const target = `  const { data: membership } = await client
    .from("project_users")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return null;
  }`;

const replacement = `  const { data: membership, error: memberError } = await client
    .from("project_users")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (memberError || !membership) {
    console.error(\`[Data] Workspace lookup failed for user \${user.id} on project \${projectId}. Error:\`, memberError?.message || "Not a member");
    return null;
  }`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content);
  console.log('Successfully patched lib/data.ts');
} else {
  console.error('Target content not found in lib/data.ts');
  // Try a more flexible match
  const lines = content.split('\n');
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const { data: membership } = await client') && lines[i+1].includes('.from("project_users")')) {
      console.log('Found target using line-by-line search at line', i + 1);
      lines[i] = '  const { data: membership, error: memberError } = await client';
      // Find the if (!membership) block
      for (let j = i; j < i + 10; j++) {
        if (lines[j].includes('if (!membership) {')) {
          lines[j] = '  if (memberError || !membership) {';
          lines[j+1] = '    console.error(`[Data] Workspace lookup failed for user ${user.id} on project ${projectId}. Error:`, memberError?.message || "Not a member");';
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }
  if (found) {
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log('Successfully patched lib/data.ts via line search');
  } else {
    console.error('Line-by-line search also failed');
  }
}
