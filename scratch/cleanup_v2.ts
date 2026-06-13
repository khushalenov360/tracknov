import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
  console.log("Cleaning up old v2 credits...");
  // Delete the incorrect v2 credits from credit_templates and project_credits
  // The incorrect ones have code like "EE C1", while the correct ones have "EE Credit 1"
  const { data: v2Credits, error } = await adminClient
    .from('credit_templates')
    .select('id, code')
    .like('code', '% C%'); // Matches 'EE C1', 'EDA C1', etc.

  if (v2Credits) {
    for (const c of v2Credits) {
      if (c.code.includes(" C") && !c.code.includes("Credit")) {
         console.log(`Deleting incorrect v2 credit: ${c.code}`);
         await adminClient.from('project_credits').delete().eq('credit_code', c.code);
         await adminClient.from('credit_templates').delete().eq('code', c.code);
      }
    }
  }
  console.log("Cleanup complete!");
}
cleanup();
