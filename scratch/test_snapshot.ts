import { createClient } from "@supabase/supabase-js";
import { resolve } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), "apps/tracknov-web/.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: projects, error: pErr } = await supabase.from("projects").select("*");
  console.log("Projects:", projects?.length, pErr);

  if (projects?.length) {
    const projectIds = projects.map(p => p.id);
    const { data: credits, error: cErr } = await supabase
      .from("project_credits")
      .select("id, project_id, credit_code, state")
      .in("project_id", projectIds);
      
    console.log(`Found ${credits?.length} credits for project IDs:`, projectIds);
    if (cErr) console.error("Credit Error:", cErr);
    
    // Test what we get if we just select all credits
    const { data: allCredits } = await supabase.from("project_credits").select("id, project_id");
    console.log(`Total credits in DB: ${allCredits?.length}`);
  }
}

run();
