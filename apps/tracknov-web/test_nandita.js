const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'nandita.bapat@sapphirefoods.in',
    password: '123456789'
  });
  if (authErr) { console.error("Auth error:", authErr); return; }

  const user = auth.user;
  console.log("Logged in as:", user.email);

  const { data: memberships, error: memErr } = await supabase
    .from("project_users")
    .select("id, project_id, user_id, role, created_at, projects(name)")
    .order("created_at", { ascending: false });

  if (memErr) { console.error(memErr); return; }

  console.log("Memberships length:", memberships?.length);

  const rows = memberships ?? [];
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
  
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("user_id, email, full_name, company, global_role")
    .in("user_id", userIds);
    
  if (profErr) { console.error(profErr); return; }
  
  console.log("Profiles count:", profiles?.length);
  
  profiles.forEach(p => console.log(p.email));
}
run();
