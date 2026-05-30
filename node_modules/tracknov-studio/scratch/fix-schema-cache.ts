import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixCache() {
  console.log("Notifying pgrst to reload schema...");
  
  // Method 1: Just do a query that might trigger a reload, or call a known RPC
  // Wait, the best way to reload the schema cache from client is via SQL if we have postgres access, 
  // but we only have supabase JS client.
  // Actually, we can just do an RPC call if there's one, or we can just try querying the table.
  // Let's just query the table to see if it throws the same error.
  const { data, error } = await supabase
    .from("project_credits")
    .select("id, state")
    .limit(1);

  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Query Success:", data);
  }
}

fixCache();
