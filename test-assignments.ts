import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const projectId = "1fabd316-6d0f-4de3-a149-7e23c528aab9";
  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_active", true);
    
  console.log("Active assignments:", data?.length);
  if (data && data.length > 0) {
    console.log("Sample:", data[0]);
  }
}

check().catch(console.error);
