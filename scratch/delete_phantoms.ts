import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseKey);

async function run() {
  const phantomCredits = ['WC C2', 'EE C6', 'EE C7', 'EE MR1', 'IM C8', 'IM C9', 'IM C10', 'IM MR2', 'IM MR3', 'IE C14', 'IE MR2', 'IE C12', 'IE C13'];
  
  console.log(`Deleting ${phantomCredits.length} phantom credits from the database...`);
  
  let { data: rsData } = await adminClient.from("rating_systems").select("id").eq("name", "IGBC Green Interiors").single();
  const rsId = rsData!.id;

  // Find Bhavarkua project
  let { data: pData } = await adminClient.from("projects").select("id").ilike("name", "%Bhavarkua%").single();
  const pId = pData!.id;

  // Find project credits to delete
  const { data: pcToDelete } = await adminClient.from("project_credits").select("id").eq("project_id", pId).in("credit_code", phantomCredits);
  if (pcToDelete && pcToDelete.length > 0) {
    const ids = pcToDelete.map(pc => pc.id);
    
    // Delete document assignments
    await adminClient.from("document_requirement_assignments").delete().in("project_credit_id", ids);
    
    // Delete tasks
    await adminClient.from("tasks").delete().in("project_credit_id", ids);

    // Delete from project_credits
    const { error: err1 } = await adminClient.from("project_credits").delete().in("id", ids);
    if (err1) console.error("Failed to delete from project_credits:", err1);
    else console.log("Deleted from project_credits.");
  }

  // Delete from credit_templates
  const { error: err2 } = await adminClient.from("credit_templates")
    .delete()
    .eq("rating_system_id", rsId)
    .in("code", phantomCredits);

  if (err2) {
    console.error("Failed to delete from credit_templates:", err2);
  } else {
    console.log("Deleted from credit_templates.");
  }

  console.log("Checking final database points...");
  const { data: credits } = await adminClient.from('project_credits').select('credit_code, max_points, na').eq('project_id', pId);
  console.log("Total remaining credits:", credits?.length);
  
  const total = credits!.reduce((sum: number, c: any) => sum + (c.max_points || 0), 0);
  console.log("Total base points:", total);
}

run().catch(console.error);
