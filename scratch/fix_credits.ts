import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseKey);

async function fix() {
  console.log("Mapping project credits to new guidebook format...");
  
  // Find Bhavarkua project
  const { data: project } = await adminClient
    .from('projects')
    .select('id, name')
    .ilike('name', '%Bhavarkua%')
    .single();

  if (!project) return;

  const mapping: Record<string, { newCode: string, newName: string, maxPoints: number }> = {
    "EE C1": { newCode: "EE Credit 1", newName: "Eco-friendly Refrigerants & Halons", maxPoints: 1 },
    "EE C2": { newCode: "EE Credit 2", newName: "Energy Efficient Interiors", maxPoints: 10 },
    "EE C3": { newCode: "EE Credit 3", newName: "Energy Metering & Management", maxPoints: 4 },
    "EE C4": { newCode: "EE Credit 4", newName: "On-site /Off-site Renewable Energy", maxPoints: 6 },
    "EE C5": { newCode: "EE Credit 5", newName: "Embodied Energy", maxPoints: 1 },
    "EDA C1": { newCode: "EDA Credit 1", newName: "Optimise Circulation Spaces", maxPoints: 2 },
    "EDA C2": { newCode: "EDA Credit 2", newName: "Public Transportation Proximity", maxPoints: 2 },
    "EDA C3": { newCode: "EDA Credit 3", newName: "Eco-friendly Commuting Practices", maxPoints: 2 },
    "EDA C4": { newCode: "EDA Credit 4", newName: "Local Community Amenities", maxPoints: 2 },
    "EDA C5": { newCode: "EDA Credit 5", newName: "Design for differently abled", maxPoints: 1 },
    "WC C1": { newCode: "WC Credit 1", newName: "Water Efficient Fixtures", maxPoints: 8 }
  };

  for (const [oldCode, newInfo] of Object.entries(mapping)) {
     const { error } = await adminClient
       .from('project_credits')
       .update({
         credit_code: newInfo.newCode,
         credit_name: newInfo.newName,
         max_points: newInfo.maxPoints
       })
       .eq('project_id', project.id)
       .eq('credit_code', oldCode);
       
     if (error) console.error(`Failed to update ${oldCode}:`, error);
     else console.log(`Updated ${oldCode} to ${newInfo.newCode}`);
  }
}

fix();
