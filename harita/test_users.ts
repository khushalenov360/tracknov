import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const { data: authUsers, error: authError } = await admin.auth.admin.listUsers();
  console.log(`auth.users count:`, authUsers?.users?.length);
  
  const { data: profiles, error: profError } = await admin.from("profiles").select("*");
  console.log(`profiles count:`, profiles?.length);

  const { data: projectUsers } = await admin.from("project_users").select("*");
  console.log(`project_users count:`, projectUsers?.length);
}

main().catch(console.error);
