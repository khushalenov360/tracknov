import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testUpdate() {
  const creditId = "1fabd316-6d0f-4de3-a149-7e23c528aab9"; // wait, need real creditId
  const { data: projects } = await supabase.from("projects").select("id").limit(1);
  const projectId = projects![0].id;
  
  const { data: credits } = await supabase.from("project_credits").select("id, documents_required").eq("project_id", projectId).limit(1);
  const pcId = credits![0].id;
  console.log("Credit ID:", pcId);
  
  const { error } = await supabase
    .from("project_credits")
    .update({ documents_required: credits![0].documents_required })
    .eq("id", pcId);
    
  console.log("Update Error:", error);
}

testUpdate().catch(console.error);
