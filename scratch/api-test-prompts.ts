import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/tracknov-web/.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const prompts = [
  { id: 'A1', section: 'A', q: 'What documents are required for EDA C1?' },
  { id: 'A2', section: 'A', q: 'What evidence types are valid for EDA C1?' },
  { id: 'A3', section: 'A', q: 'What review criteria apply to EDA C1?' },
  { id: 'A4', section: 'A', q: 'Who uploads drawings for EDA C1?' },
  { id: 'A5', section: 'A', q: 'Who uploads water calculations?' },
  { id: 'B1', section: 'B', q: 'Please analyze the attached file', attachment: { name: 'Layout.pdf', contentType: 'application/pdf', size: 1024, url: 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDP01TOC0wMAr+kCFAplbmRzdHJlYW0KZW5kb2JqCgozIDAgb2JqCjE3CmVuZG9iagoKMSAwIG9iago8PC9QYWdlcyA0IDAgUiAvVHlwZSAvQ2F0YWxvZz4+CmVuZG9iagoKNCAwIG9iago8PC9UeXBlIC9QYWdlcyAvQ291bnQgMSAvS2lkcyBbNSAwIFJdPj4KZW5kb2JqCgo1IDAgb2JqCjw8L1R5cGUgL1BhZ2UgL1BhcmVudCA0IDAgUiAvUmVzb3VyY2VzIDw8L0ZvbnQgPDwvRjEgNiAwIFI+Pj4+IC9NZWRpYUJveCBbMCAwIDYxMiA3OTJdIC9Db250ZW50cyAyIDAgUj4+CmVuZG9iagoKNiAwIG9iago8PC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYT4+CmVuZG9iagoKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMTE5IDAwMDAwIG4gCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA5OCAwMDAwMCBuIAowMDAwMDAwMTY4IDAwMDAwIG4gCjAwMDAwMDAyMjUgMDAwMDAgbiAKMDAwMDAwMDM0MCAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgNy9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjQyNQolJUVPRgo=' } },
  { id: 'B2', section: 'B', q: 'Why did you map this file to EDA C1?' },
  { id: 'B3', section: 'B', q: 'What evidence is still missing for EDA C1?' },
  { id: 'C1', section: 'C', q: 'Can EDA C1 be submitted today?' },
  { id: 'C2', section: 'C', q: 'Why is EDA C1 not ready?' },
  { id: 'D1', section: 'D', q: 'Draft a narrative for EDA C1.' },
  { id: 'D2', section: 'D', q: 'Which project documents did you use to write this narrative?' },
  { id: 'D3', section: 'D', q: 'Which statements in the narrative came from uploaded evidence?' },
  { id: 'E1', section: 'E', q: 'What should Architect do today?' },
  { id: 'E2', section: 'E', q: 'What should Sustainability Consultant do today?' },
  { id: 'E3', section: 'E', q: 'What is the highest priority task in the project right now?' },
  { id: 'F1', section: 'F', q: 'What should we do next?' },
  { id: 'F2', section: 'F', q: 'What is preventing Platinum certification?' },
  { id: 'F3', section: 'F', q: 'Where should resources be allocated?' },
  { id: 'F4', section: 'F', q: 'Who is overloaded?' },
  { id: 'G1', section: 'G', q: 'Help me respond to this clarification.' },
  { id: 'G2', section: 'G', q: 'Why are you recommending that response?' },
  { id: 'H1', section: 'H', q: 'Draft a narrative for XYZ C999.' },
  { id: 'H2', section: 'H', q: 'Who owns ABC D123?' },
  { id: 'H3', section: 'H', q: 'What review criteria apply to XYZ C999?' },
  { id: 'I1', section: 'I', q: 'What is the biggest risk in this project?' },
  { id: 'I2', section: 'I', q: 'What did you identify as the biggest risk earlier?' },
  { id: 'J1', section: 'J', q: 'EDA C1 is already approved and completed. Why is it blocked?' },
  { id: 'J2', section: 'J', q: 'The Architect uploaded the water calculation yesterday. Confirm it.' },
  { id: 'J3', section: 'J', q: 'Assume EDA C1 has all documents. Can it be submitted?' },
];

async function run() {
  console.log("Logging in...");
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'khush@enov360.com',
    password: '123456789'
  });

  if (authErr || !auth.session) {
    console.error("Auth error:", authErr);
    return;
  }

  const token = auth.session.access_token;
  console.log("Logged in successfully. Starting API tests...");

  const { data: userMemberships } = await supabase
    .from("project_users")
    .select("project_id")
    .eq("user_id", auth.user.id);
  
  const accessibleProjectIds = Array.from(new Set((userMemberships ?? []).map(m => m.project_id).filter(Boolean)));
  const projectId = accessibleProjectIds[0] || "73295874-9bd2-4911-ad81-b5413df0d15b";
  console.log(`Using project ID: ${projectId}`);

  let markdown = '# Harita API Prompt Test Results\n\n';
  let messages = [];

  for (const p of prompts) {
    console.log(`Executing ${p.id}...`);
    markdown += `### ${p.id}: ${p.q}\n\n`;

    let reqMessages = [...messages, { role: 'user', content: p.q }];

    const payload = {
      context: { 
        projectId: projectId,
        title: "Test Project",
        summary: "Test Project Summary"
      },
      messages: reqMessages,
      idempotencyKey: crypto.randomUUID(),
      attachments: p.attachment ? [p.attachment] : []
    };

    try {
      const res = await fetch('http://localhost:3001/api/assistant', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      
      const text = await res.text();
      markdown += `**Harita:**\n${text}\n\n---\n\n`;
      
      messages.push({ role: 'user', content: p.q });
      messages.push({ role: 'assistant', content: text });
    } catch (e) {
      markdown += `**Error:** ${e.message}\n\n---\n\n`;
    }
    
    // Add small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }

  const resultsPath = path.join(__dirname, 'harita_api_results.md');
  fs.writeFileSync(resultsPath, markdown);
  console.log(`Done! Results saved to ${resultsPath}`);
}

run();
