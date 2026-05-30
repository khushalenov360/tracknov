const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const client = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: auth } = await client.auth.signInWithPassword({
    email: 'khush@enov360.com',
    password: '123456789'
  });
  const user = auth.user;

  console.log("Entering Fallback Block");
  const { data: userMemberships } = await client
    .from("project_users")
    .select("project_id")
    .eq("user_id", user.id);
  const accessibleProjectIds = (userMemberships ?? []).map((m) => m.project_id);

  const { data: memberships, error } = await client
    .from("project_users")
    .select("id, project_id, user_id, role, created_at, projects(name)")
    .in("project_id", accessibleProjectIds)
    .order("created_at", { ascending: false });

  if (error) console.error(error);
  
  const rows = memberships ?? [];
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
  
  const { data: profiles, error: pErr } = userIds.length
    ? await client.from("profiles").select("user_id, email, full_name, company, global_role, disabled_at, disabled_reason").in("user_id", userIds)
    : { data: [] };
    
  if (pErr) console.error(pErr);
  
  const profilesByUser = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
  const grouped = new Map();

  rows.forEach((row) => {
    const profile = profilesByUser.get(row.user_id);
    const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
    grouped.set(row.user_id, {
      id: row.user_id,
      email: profile?.email ?? row.user_id,
    });
  });
  
  const result = Array.from(grouped.values());
  console.log("Fallback block returned members:", result.length);
  console.log("Users:", result.map(u => u.email));
}
run();
