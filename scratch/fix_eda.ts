import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseKey);

async function fixEDA() {
  console.log("Fixing EDA credits...");
  
  const { data: project } = await adminClient.from('projects').select('id').ilike('name', '%Bhavarkua%').single();
  const { data: rsData } = await adminClient.from('rating_systems').select('id').eq('name', 'IGBC Green Interiors').single();
  
  if (!project || !rsData) return;

  const correctEDA = [
    { code: "EDA Credit 1", name: "Eco Vision for Interior Design", maxPoints: 2 },
    { code: "EDA Credit 2", name: "Optimise Circulation Spaces", maxPoints: 2 },
    { code: "EDA Credit 3", name: "Public Transportation Proximity", maxPoints: 1 },
    { code: "EDA Credit 4", name: "Occupancy in a Green Facility", maxPoints: 1 },
    { code: "EDA Credit 5", name: "Commercial Lease Term / Ownership", maxPoints: 2 },
  ];

  // Fix project_credits
  for (const c of correctEDA) {
     await adminClient.from('project_credits').update({
       credit_name: c.name,
       max_points: c.maxPoints
     }).eq('project_id', project.id).eq('credit_code', c.code);
     
     await adminClient.from('credit_templates').update({
       name: c.name,
       max_points: c.maxPoints
     }).eq('rating_system_id', rsData.id).eq('code', c.code);
  }
  
  console.log("Done fixing EDA!");
}
fixEDA();
