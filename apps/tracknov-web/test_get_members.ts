import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
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

  const walletByClient = new Map((wallets ?? []).map((wallet: any) => [wallet.client_user_id, Number(wallet.token_balance ?? 0)]));
  const grouped = new Map<string, any>();

  (profiles ?? []).forEach((profile: any) => {
    grouped.set(profile.user_id, {
      id: profile.user_id,
      user_id: profile.user_id,
      email: profile.email ?? profile.user_id,
      full_name: profile.full_name ?? "Project member",
      company: profile.company ?? null,
      role: profile.global_role ?? "consultant",
      project_names: [],
      project_ids: [],
      created_at: profile.created_at ?? new Date().toISOString(),
      token_balance: walletByClient.get(profile.user_id) ?? 0,
      disabled_at: profile.disabled_at ?? null,
      disabled_reason: profile.disabled_reason ?? null,
    });
  });

  (memberships ?? []).forEach((row: any) => {
    const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
    const existing = grouped.get(row.user_id);
    if (existing) {
      if (project?.name && !existing.project_names.includes(project.name)) {
        existing.project_names.push(project.name);
      }
    }
  });

  const arr = Array.from(grouped.values());
  console.log("LENGTH:", arr.length);
  console.log(arr.map(x => x.full_name + " - " + x.role + " - " + x.project_names.join(", ")));
}

main().catch(console.error);
