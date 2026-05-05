
import fs from 'fs';

const filePath = 'c:\\Users\\91922\\Documents\\Codex\\2026-04-23-can-you-read-https-github-com\\harita\\lib\\data.ts';
let content = fs.readFileSync(filePath, 'utf8');

const target = `  // 1. Always check the PROFILES table first (This is the source of truth for global roles)
  const { data: profile } = await client
    .from("profiles")
    .select("global_role, disabled_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.disabled_at) return null;

  if (profile?.global_role) {
    return { 
      id: user.id, 
      email: user.email ?? "", 
      role: normalizeRole(profile.global_role) 
    };
  }

  // 2. Fallback to metadata
  const metadataRole =`;

const replacement = `  // 2. Fallback to metadata
  const metadataRole =`;

// Try with both CRLF and LF
if (content.includes(target.replace(/\n/g, '\r\n'))) {
    content = content.replace(target.replace(/\n/g, '\r\n'), replacement.replace(/\n/g, '\r\n'));
} else if (content.includes(target)) {
    content = content.replace(target, replacement);
} else {
    console.log("Target not found!");
}

fs.writeFileSync(filePath, content);
console.log("File updated!");
