import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/tracknov-web/.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'khush@enov360.com',
    password: '123456789'
  });

  if (authErr) { console.error("Auth error:", authErr); return; }

  const token = auth.session.access_token;
  
  const payload = {
    context: { 
      projectId: "1fabd316-6d0f-4de3-a149-7e23c528aab9",
      title: "Test Project",
      summary: "Test Project Summary"
    },
    messages: [{ role: 'user', content: 'What documents are required for EDA C1?' }],
    idempotencyKey: 'test-123',
    attachments: []
  };

  const res = await fetch('http://localhost:3001/api/assistant', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify(payload)
  });
  
  console.log('Status:', res.status);
  console.log('Headers:', Object.fromEntries(res.headers.entries()));
  const text = await res.text();
  console.log('Body:', text);
}

run();
