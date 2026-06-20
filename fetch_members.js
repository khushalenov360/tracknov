const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const http = require('http');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);

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
  const base64Cookie = Buffer.from(cookieStr).toString('base64');
  
  const cookieHeader = `sb-${projectId}-auth-token.0=${base64Cookie};`;

  console.log("Fetching /members with cookies...");
  
  http.get('http://localhost:3000/members', {
    headers: { 'Cookie': cookieHeader }
  }, (resp) => {
    let data = '';
    resp.on('data', (chunk) => { data += chunk; });
    resp.on('end', () => { 
      fs.writeFileSync('members_dump.html', data);
      console.log("Status:", resp.statusCode);
      if (data.includes("DEBUG: TOTAL MEMBERS RETURNED:")) {
        const idx = data.indexOf("DEBUG: TOTAL MEMBERS RETURNED:");
        console.log("Found:", data.substring(idx, idx + 50));
      } else {
        console.log("NOT FOUND IN HTML");
      }
    });
  }).on("error", (err) => {
    console.log("Error: " + err.message);
  });
}
run();
