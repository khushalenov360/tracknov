import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(__dirname, "../apps/tracknov-web/.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Get Khush user ID
  const { data: users } = await supabase.auth.admin.listUsers();
  const khush = users.users.find(u => u.email === "khush@enov360.com");
  if (!khush) {
    console.log("User not found");
    return;
  }
  
  // Impersonate
  const client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: {
      headers: {
        Authorization: `Bearer ${khush.id}`, // Just for RLS checking if we had token, but we don't have token.
      }
    }
  });
  
  // Let's just manually query as Service Role to see if project_id matches exactly.
  const { data: p } = await supabase.from("projects").select("id, name").ilike("name", "%bhavarkua%").single();
  console.log("Project:", p);
  
  const { data: credits, error } = await supabase.from("project_credits").select("id, project_id, credit_code, credit_name").eq("project_id", p.id);
  console.log("Credits array length:", credits?.length);
  if (error) console.error("Credits error:", error);
}

run().catch(console.error);
