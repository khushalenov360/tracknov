import { createClient } from "@supabase/supabase-js";

const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  isConfigured: Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
};

if (!env.isConfigured || !env.supabaseServiceRoleKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY before running npm run seed.");
  process.exit(1);
}

const args = process.argv.slice(2);
const projectName = args[0] ?? "Tracknov Seed Project";
const targetRating = args[1] ?? "Gold";
const ownerUserId = args[2] ?? null;

const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

// 1. Resolve rating system
const { data: ratingSystem } = await supabase
  .from("rating_systems")
  .select("id, name")
  .eq("name", "IGBC Green Interiors")
  .limit(1)
  .maybeSingle();

const ratingSystemId = ratingSystem?.id ?? null;
const ratingSystemName = ratingSystem?.name ?? "IGBC Green Interiors";

// 2. Create project
const { data: project, error: projectError } = await supabase
  .from("projects")
  .insert({
    name: projectName,
    target_rating: targetRating,
    certification_type: ratingSystemName,
    rating_system_id: ratingSystemId,
  })
  .select("id")
  .single();

if (projectError || !project) {
  console.error("Failed to create project:", projectError);
  process.exit(1);
}

// 3. Initialize membership
if (ownerUserId) {
  await supabase.from("project_users").insert({
    project_id: project.id,
    user_id: ownerUserId,
    role: "owner",
  });
}

// 4. Initialize project credits from templates
if (ratingSystemId) {
  const { data: templates, error: templatesError } = await supabase
    .from("credit_templates")
    .select("*, category:credit_categories(name)")
    .eq("rating_system_id", ratingSystemId);

  if (templatesError) {
    console.error("Failed to fetch templates:", templatesError);
    process.exit(1);
  }

  if (templates && templates.length > 0) {
    const projectCreditsToInsert = templates.map((template) => ({
      project_id: project.id,
      credit_template_id: template.id,
      credit_code: template.code,
      credit_name: template.name,
      category_id: template.category_id,
      category_name: template.category?.name ?? null,
      max_points: template.max_points || 0,
      status: "DRAFT",
    }));

    const { error: insertError } = await supabase
      .from("project_credits")
      .insert(projectCreditsToInsert);

    if (insertError) {
      console.error("Failed to insert project credits:", insertError);
      process.exit(1);
    }
  } else {
    console.warn("No credit templates found for rating system. Seeding project without credits.");
  }
} else {
  console.warn("Rating system 'IGBC Green Interiors' not found. Seeding project without credits.");
}

console.log(`Seeded project ${projectName} (${project.id})`);
