import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { getProjectWorkspace } from "./lib/data";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const projectId = '1fabd316-6d0f-4de3-a149-7e23c528aab9';
  const { data: user } = await supabase.from('users').select('*').limit(1).single();
  const workspace = await getProjectWorkspace(projectId);
  if (workspace) {
    const c = workspace.credits[0];
    console.log("Credit ID:", c.id);
    console.log("Docs required:", c.documents_required);
  } else {
    console.log("No workspace");
  }
}

check().catch(console.error);
