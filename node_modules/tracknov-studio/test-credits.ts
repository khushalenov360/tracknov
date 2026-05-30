import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const projectId = '1fabd316-6d0f-4de3-a149-7e23c528aab9';
  const { data: credits } = await supabase.from("project_credits").select("id, credit_code").eq("project_id", projectId);
  const { data: assignments } = await supabase.from("assignments").select("project_credit_id").eq("is_active", true).eq("project_id", projectId);
  
  const creditIds = credits?.map(c => c.id) || [];
  const assignmentCreditIds = [...new Set(assignments?.map(a => a.project_credit_id))];
  
  console.log("Credits in DB:", credits?.slice(0, 3));
  console.log("Assignment credit IDs:", assignmentCreditIds.slice(0, 3));
  
  const missing = assignmentCreditIds.filter(id => !creditIds.includes(id));
  console.log("Assignment credit IDs missing from project_credits:", missing.length, missing);
}

check().catch(console.error);
