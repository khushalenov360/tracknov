const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

// We need a session, so let's log in
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'khush@enov360.com',
    password: '123456789'
  });
  if (authErr) { console.error("Auth error:", authErr); return; }
  console.log("Logged in as:", auth.user.email);

  // Now query profiles using this regular client (subject to RLS)
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('global_role')
    .eq('user_id', auth.user.id);
    
  console.log("Profile data from standard client:", profile);
  if (error) console.error("Error:", error);
}

run();
