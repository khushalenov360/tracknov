import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(__dirname, "apps/tracknov-web/.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: users } = await supabase.auth.admin.listUsers();
  const khush = users.users.find(u => u.email === "khush@enov360.com");
  if (!khush) return console.log("Khush not found");

  const { data: p } = await supabase.from("projects").select("id, name").ilike("name", "%bhavarkua%").single();
  
  const { data: pu } = await supabase.from("project_users").select("*").eq("project_id", p.id).eq("user_id", khush.id);
  console.log("Is Khush in project_users?", pu?.length ? true : false, pu);

  // check global role
  const { data: pr } = await supabase.from("profiles").select("*").eq("user_id", khush.id);
  console.log("Khush profile:", pr);
}
run().catch(console.error);
