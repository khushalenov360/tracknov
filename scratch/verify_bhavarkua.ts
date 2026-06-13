import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log("Verifying project credits...");
  
  // Find Bhavarkua project
  const { data: project } = await adminClient
    .from('projects')
    .select('id, name')
    .ilike('name', '%Bhavarkua%')
    .single();

  if (!project) {
    console.log("Could not find Bhavarkua project.");
    return;
  }

  console.log(`Found project: ${project.name} (${project.id})`);

  // Query EDA Credits for this project
  const { data: credits, error } = await adminClient
    .from('project_credits')
    .select('credit_code, credit_name, max_points')
    .eq('project_id', project.id)
    .like('credit_code', '%EDA%');

  if (error) {
    console.error("Error fetching credits:", error);
    return;
  }

  console.log("EDA Credits in DB:");
  console.log(JSON.stringify(credits, null, 2));
}

verify();
