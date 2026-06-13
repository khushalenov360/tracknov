import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await adminClient
    .from('project_guidebooks')
    .select('id, file_name, file_path')
    .eq('project_id', '1fabd316-6d0f-4de3-a149-7e23c528aab9');
    
  console.log(data);
}
check();
