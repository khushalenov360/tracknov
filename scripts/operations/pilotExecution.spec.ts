import { createAdminClient } from "../../lib/supabase/admin";

async function validatePilotExecution() {
  console.log("🚀 STARTING: Pilot Execution Validation (Bhavarkua + CCIL)");
  const supabase = createAdminClient();

  const pilots = [
    { name: "Bhavarkua", framework: "GI_V1" },
    { name: "CCIL", framework: "GI_V2" }
  ];

  for (const pilot of pilots) {
    console.log(`\n📂 Validating Pilot: ${pilot.name} (${pilot.framework})`);
    
    // 1. Fetch Project
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .ilike("name", `%${pilot.name}%`)
      .single();

    if (!project) {
      console.error(`❌ FAIL: Pilot project ${pilot.name} not found.`);
      continue;
    }

    // 2. Validate Framework Alignment
    if (project.igbc_variant === pilot.framework || project.igbc_variant === 'new') {
      console.log(`✅ PASS: Framework alignment verified (${project.igbc_variant}).`);
    } else {
      console.error(`❌ FAIL: Framework mismatch for ${pilot.name}. Expected ${pilot.framework}, found ${project.igbc_variant}.`);
    }

    // 3. Check Credit Instantiation
    const { data: credits, error: creditError } = await supabase
      .from("project_credits")
      .select("id, status")
      .eq("project_id", project.id);

    if (creditError) {
      console.error(`❌ ERROR: Failed to fetch credits for ${pilot.name}:`, creditError);
      continue;
    }

    if (credits && credits.length >= 40) {
      console.log(`✅ PASS: ${credits.length} credits instantiated.`);
    } else {
      console.error(`❌ FAIL: Incomplete credit instantiation for ${pilot.name}. Found ${credits?.length || 0} credits.`);
    }

    // 4. Verify Reviewer Assignment
    const { data: assignments } = await supabase
      .from("project_users")
      .select("role")
      .eq("project_id", project.id)
      .in("role", ["super_user", "super_admin", "project_admin"]);

    if (assignments && assignments.length > 0) {
      console.log(`✅ PASS: Reviewer/Admin assigned to project.`);
    } else {
      console.warn(`⚠️ WARNING: No administrative reviewer assigned to ${pilot.name}.`);
    }

    // 5. Test Export Lineage Proof
    const { data: exports } = await supabase
      .from("export_generation_history")
      .select("id, replay_hash")
      .eq("project_id", project.id)
      .limit(1);

    if (exports && exports.length > 0) {
      console.log(`✅ PASS: Export lineage verified for ${pilot.name}.`);
    } else {
      console.warn(`⚠️ WARNING: No export history found for ${pilot.name}. Run an export to verify.`);
    }
  }

  console.log("\n✅ FINISHED: Pilot Execution Validation");
}

validatePilotExecution().catch(err => {
  console.error("FATAL ERROR during pilot validation:", err);
  process.exit(1);
});
