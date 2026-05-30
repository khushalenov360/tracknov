const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, key);

async function run() {
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('user_id, email, full_name, global_role');
    
  console.log("Admin Profiles count:", profiles?.length);
  if (error) console.error("Error:", error);
}

run();
