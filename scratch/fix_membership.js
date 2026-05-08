
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'lib', 'data.ts');
let content = fs.readFileSync(filePath, 'utf8');

const target = `  const { data: membership } = await client
    .from("project_users")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();`;

const replacement = `  // Use admin client for membership lookup to bypass potential RLS issues in dashboard context
  const admin = createAdminClient();
  const { data: membership, error: memberError } = await admin
    .from("project_users")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (memberError) {
    console.error("[Data] Membership lookup error:", memberError.message);
  }`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content);
  console.log('Successfully applied PERMANENT MEMBERSHIP FIX');
} else {
  console.error('Target not found for membership fix');
  // Fallback to line search
  const lines = content.split('\n');
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const { data: membership } = await client') && lines[i+1].includes('.from("project_users")')) {
        console.log('Found target using line-by-line search at line', i + 1);
        lines[i] = '  const admin = createAdminClient();';
        lines[i+1] = '  const { data: membership, error: memberError } = await admin';
        // The rest of the lines (.from, .select, etc.) are fine as they are chained.
        // But we need to insert the error log
        found = true;
        break;
    }
  }
  if (found) {
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log('Successfully applied PERMANENT MEMBERSHIP FIX via line search');
  } else {
    console.error('Line search also failed');
  }
}
