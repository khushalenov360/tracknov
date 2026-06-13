import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await adminClient
    .from('credit_templates')
    .select('code, name, max_points')
    .like('code', 'EE%')
    .order('code', { ascending: true });
    
  console.log(JSON.stringify(data, null, 2));
}
check();
