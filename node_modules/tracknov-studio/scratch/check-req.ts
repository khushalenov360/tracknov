import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkReq() {
  const projectId = "1fabd316-6d0f-4de3-a149-7e23c528aab9"; 
  const { data: credit } = await supabase
    .from("project_credits")
    .select("id, credit_code, documents_required")
    .eq("project_id", projectId)
    .eq("credit_code", "EDA C1")
    .single();

  console.log(`Credit: ${credit?.credit_code}`);
  console.log(JSON.stringify(credit?.documents_required, null, 2));
}

checkReq();
