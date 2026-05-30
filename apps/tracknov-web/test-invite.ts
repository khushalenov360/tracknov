import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
  const projectId = '1fabd316-6d0f-4de3-a149-7e23c528aab9';
  const email = "testinvite@example.com";
  const role = "consultant";
  const token = crypto.randomUUID();

  // Test inserting into project_invites
  const { data, error } = await supabase.from("project_invites").insert({
    project_id: projectId,
    email,
    role,
    token,
  }).select().single();

  if (error) {
    console.error("Failed to insert invite:", error);
    process.exit(1);
  }

  console.log("Successfully inserted invite:", data);

  // Clean up
  await supabase.from("project_invites").delete().eq("id", data.id);
  console.log("Successfully cleaned up invite");
}

test().catch(console.error);
