const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'khush@enov360.com',
    password: '123456789'
  });
  if (authErr) { console.error("Auth error:", authErr); return; }
  console.log("Logged in as:", auth.user.email);

  const { data: userMemberships } = await supabase
    .from("project_users")
    .select("project_id")
    .eq("user_id", auth.user.id);
  
  const accessibleProjectIds = Array.from(new Set((userMemberships ?? []).map(m => m.project_id).filter(Boolean)));
  console.log("accessibleProjectIds", accessibleProjectIds);

  const { data: memberships } = await supabase
    .from("project_users")
    .select("id, project_id, user_id, role")
    .in("project_id", accessibleProjectIds);

  console.log("Memberships length:", memberships?.length);

  const userIds = Array.from(new Set((memberships ?? []).map((row) => row.user_id).filter(Boolean)));
  console.log("User IDs length:", userIds.length);

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id, email, full_name, global_role")
    .in("user_id", userIds);
    
  console.log("Profiles count:", profiles?.length);
  if (error) console.error("Error:", error);
  console.log("Profiles:", profiles);
}

run();
