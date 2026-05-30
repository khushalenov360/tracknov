import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testLock() {
  const projectId = "1fabd316-6d0f-4de3-a149-7e23c528aab9"; // The project ID we saw earlier

  // 1. Check current lock status
  const { data: project } = await supabase
    .from("projects")
    .select("assignments_locked")
    .eq("id", projectId)
    .single();

  console.log(`Current lock state: ${project?.assignments_locked}`);

  // 2. Try to update it
  const { error } = await supabase
    .from("projects")
    .update({ assignments_locked: false }) // Try to unlock
    .eq("id", projectId);

  if (error) {
    console.error("Failed to unlock directly:", error);
  } else {
    console.log("Successfully unlocked directly via service role!");
  }
}

testLock();
