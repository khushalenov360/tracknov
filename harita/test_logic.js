const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create authenticated client (like Next.js standard client)
const client = createClient(supabaseUrl, supabaseKey);

// Create admin client (like Next.js createAdminClient)
const admin = createClient(supabaseUrl, serviceKey);

function normalizeRole(role) {
  if (role === "superuser") return "super_user";
  if (role === "admin") return "super_admin";
  const upper = (role || "").toUpperCase();
  if (upper === "L0" || upper === "L1" || upper === "L2" || upper === "L3" || upper === "L4" || upper === "L5") {
    return upper;
  }
  const supported = ["super_user", "l4_reserved", "owner", "client", "consultant", "architect", "mep", "contractor", "project_admin", "super_admin"];
  return supported.includes(role) ? role : "consultant";
}

async function run() {
  const { data: auth, error: authErr } = await client.auth.signInWithPassword({
    email: 'khush@enov360.com',
    password: '123456789'
  });
  if (authErr) { console.error("Auth error:", authErr); return; }
  
  const user = auth.user;

  // --- START LOGIC FROM getCurrentUserUncached ---
  const { data: profile } = await client
    .from("profiles")
    .select("global_role, disabled_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const currentUser = profile ? { ...user, role: normalizeRole(profile.global_role) } : { ...user, role: "consultant" };
  console.log("Current User Role:", currentUser.role);

  // --- START LOGIC FROM getTeamMembers ---
  if ((currentUser.role === "super_user" || currentUser.role === "L5") && serviceKey) {
    console.log("Entering Admin Block");
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, email, full_name, company, global_role, disabled_at, disabled_reason, created_at")
      .order("created_at", { ascending: false });

    const { data: memberships } = await admin
      .from("project_users")
      .select("id, project_id, user_id, role, created_at, projects(name)");

    const { data: wallets } = await admin
      .from("client_token_wallets")
      .select("client_user_id, token_balance");

    const walletByClient = new Map((wallets ?? []).map((wallet) => [wallet.client_user_id, Number(wallet.token_balance ?? 0)]));
    const grouped = new Map();

    (profiles ?? []).forEach((profile) => {
      grouped.set(profile.user_id, {
        id: profile.user_id,
        user_id: profile.user_id,
        email: profile.email ?? profile.user_id,
        role: normalizeRole(profile.global_role ?? "consultant"),
        project_names: [],
      });
    });

    (memberships ?? []).forEach((row) => {
      const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
      const existing = grouped.get(row.user_id);
      if (existing) {
        if (project?.name && !existing.project_names.includes(project.name)) {
          existing.project_names.push(project.name);
        }
      }
    });

    const result = Array.from(grouped.values());
    console.log("Admin block returned members:", result.length);
    console.log("Users:", result.map(u => u.email + " -> " + u.project_names.join(",")));
  } else {
    console.log("Entering Fallback Block");
    const { data: userMemberships } = await client
      .from("project_users")
      .select("project_id")
      .eq("user_id", user.id);
    const accessibleProjectIds = (userMemberships ?? []).map((m) => m.project_id);

    const { data: memberships } = await client
      .from("project_users")
      .select("id, project_id, user_id, role, created_at, projects(name)")
      .in("project_id", accessibleProjectIds)
      .order("created_at", { ascending: false });

    const rows = memberships ?? [];
    const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
    
    const { data: profiles } = userIds.length
      ? await client.from("profiles").select("user_id, email, full_name, company, global_role, disabled_at, disabled_reason").in("user_id", userIds)
      : { data: [] };
      
    const profilesByUser = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
    const grouped = new Map();

    rows.forEach((row) => {
      const profile = profilesByUser.get(row.user_id);
      const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
      const existing = grouped.get(row.user_id);
      if (existing) {
        if (project?.name && !existing.project_names.includes(project.name)) {
          existing.project_names.push(project.name);
        }
        return;
      }
      grouped.set(row.user_id, {
        id: row.user_id,
        email: profile?.email ?? row.user_id,
        project_names: project?.name ? [project.name] : [],
      });
    });
    
    const result = Array.from(grouped.values());
    console.log("Fallback block returned members:", result.length);
    console.log("Users:", result.map(u => u.email + " -> " + u.project_names.join(",")));
  }
}
run();
