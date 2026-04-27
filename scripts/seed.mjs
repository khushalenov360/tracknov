import { createClient } from "@supabase/supabase-js";
import catalog from "../data/igbc-green-interiors-v2.json" assert { type: "json" };

const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  isConfigured: Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
};

function buildSeedCredits(projectId) {
  return catalog.map((credit) => ({
    project_id: projectId,
    credit_code: credit.credit_code,
    category: credit.credit_code.split(" ")[0],
    credit_name: credit.credit_name,
    is_mandatory: credit.is_mandatory,
    documents_required: credit.documents_required,
    documentation_summary: credit.documentation_summary,
    completion_pct: 0,
    status: credit.na ? "complete" : "pending",
    blocked_by: null,
    na: credit.na,
  }));
}

if (!env.isConfigured || !env.supabaseServiceRoleKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY before running npm run seed.");
  process.exit(1);
}

const args = process.argv.slice(2);
const projectName = args[0] ?? "HaritaDocs Seed Project";
const targetRating = args[1] ?? "Gold";
const ownerUserId = args[2] ?? null;

const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

const { data: project, error: projectError } = await supabase
  .from("projects")
  .insert({
    name: projectName,
    target_rating: targetRating,
    certification_type: "IGBC Green Interiors v2",
  })
  .select("id")
  .single();

if (projectError || !project) {
  console.error(projectError);
  process.exit(1);
}

if (ownerUserId) {
  await supabase.from("project_members").insert({
    project_id: project.id,
    user_id: ownerUserId,
    role: "owner",
  });
}

const { error: creditsError } = await supabase.from("credits").insert(buildSeedCredits(project.id));
if (creditsError) {
  console.error(creditsError);
  process.exit(1);
}

console.log(`Seeded project ${projectName} (${project.id})`);
