import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const projectId = '1fabd316-6d0f-4de3-a149-7e23c528aab9';
  const { data: assignments } = await supabase.from("assignments").select("user_id").eq("is_active", true).eq("project_id", projectId);
  const { data: projectUsers } = await supabase.from("project_users").select("user_id, role").eq("project_id", projectId);
  
  console.log("Unique user_ids in assignments:", [...new Set(assignments?.map(a => a.user_id))]);
  console.log("Users:", projectUsers);
}

check().catch(console.error);
