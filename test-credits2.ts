import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data, error } = await supabase.from("projects").update({ assignments_locked: false }).eq("id", "1fabd316-6d0f-4de3-a149-7e23c528aab9");
  console.log("Error:", error);
}

check().catch(console.error);
