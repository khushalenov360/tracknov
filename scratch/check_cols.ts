import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await adminClient
    .rpc('get_table_columns', { table_name: 'credit_templates' });
    
  if (error) {
    const { data: d2, error: e2 } = await adminClient.from('credit_templates').select('*').limit(1);
    if (d2) console.log(Object.keys(d2[0]));
  } else {
    console.log(data);
  }
}
check();
