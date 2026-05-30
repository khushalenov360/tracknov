const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const http = require('http');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'khush@enov360.com',
    password: '123456789'
  });
  if (authErr) { console.error("Auth error:", authErr); return; }
  
  const token = auth.session.access_token;
  const refreshToken = auth.session.refresh_token;
  
  const projectId = supabaseUrl.split('//')[1].split('.')[0];
  const cookieName = `sb-${projectId}-auth-token`;
  
  const cookieStr = JSON.stringify({ access_token: token, refresh_token: refreshToken });
  // @supabase/ssr creates base64 encoded strings
  const base64Cookie = Buffer.from(cookieStr).toString('base64');
  
  // It also splits cookies if they are too long. Let's see if one chunk works.
  const cookieHeader = `${cookieName}=${base64Cookie}`;

  console.log("Fetching /api/dump-members with cookies...");
  
  http.get('http://localhost:3000/api/dump-members', {
    headers: { 'Cookie': cookieHeader }
  }, (resp) => {
    let data = '';
    resp.on('data', (chunk) => { data += chunk; });
    resp.on('end', () => { 
      console.log("Response:", data);
    });
  }).on("error", (err) => {
    console.log("Error: " + err.message);
  });
}
run();
