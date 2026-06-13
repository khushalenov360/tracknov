import * as dotenv from 'dotenv'; dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  let { data: rsData } = await supabase.from('rating_systems').select('id').eq('name', 'IGBC Green Interiors').single();
  const rsId = rsData!.id;
  let { data: pData } = await supabase.from('projects').select('id').ilike('name', '%Bhavarkua%').single();
  const pId = pData!.id;
  let { data: catData } = await supabase.from('credit_categories').select('id, name').eq('rating_system_id', rsId);
  const catId = catData!.find(c => c.name.includes('Indoor Environment'))!.id;

  const credits = [
    { code: 'IE MR2', name: 'Fresh Air Ventilation', is_mandatory: true, max_points: 0 },
    { code: 'IE C12', name: 'Interior Flush out', is_mandatory: false, max_points: 1 },
    { code: 'IE C13', name: 'Occupant Well-being Facilities', is_mandatory: false, max_points: 2 },
    { code: 'IE C14', name: 'Dedicated Dining Spaces', is_mandatory: false, max_points: 0 }
  ];

  for (const c of credits) {
    const { data: upsertData, error: err1 } = await supabase.from('credit_templates').upsert({
      rating_system_id: rsId, category_id: catId, code: c.code, name: c.name, is_mandatory: c.is_mandatory, max_points: c.max_points
    }, { onConflict: 'rating_system_id,code' }).select('id');
    
    if (err1) console.error("Template upsert error:", err1);

    if (upsertData && upsertData.length > 0) {
      const { data: legacyCredit } = await supabase.from('credits').select('id').eq('credit_code', c.code).single();
      if (!legacyCredit) {
         console.error("Could not find legacy credit for", c.code);
         continue;
      }
      
      const { error: err2 } = await supabase.from('project_credits').upsert({
        project_id: pId, credit_id: legacyCredit.id, credit_code: c.code, max_points: c.max_points, na: false
      }, { onConflict: 'project_id,credit_code' });
      if (err2) console.error("Project credit upsert error:", err2);
    }
  }

  const { data: finalC } = await supabase.from('project_credits').select('max_points').eq('project_id', pId);
  console.log('Total credits:', finalC!.length);
  console.log('Total points:', finalC!.reduce((sum, c) => sum + (c.max_points || 0), 0));
}

run().catch(console.error);
