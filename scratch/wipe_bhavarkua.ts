import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseKey);

async function wipe() {
  console.log("Wiping Bhavarkua project credits...");
  
  // Find Bhavarkua project
  const { data: project } = await adminClient
    .from('projects')
    .select('id, name')
    .ilike('name', '%Bhavarkua%')
    .single();

  if (!project) return;

  const { error } = await adminClient
    .from('project_credits')
    .delete()
    .eq('project_id', project.id);
    
  if (error) {
    console.error("Failed to wipe:", error);
  } else {
    console.log("Successfully wiped all old credits for Bhavarkua!");
  }
}

wipe();
