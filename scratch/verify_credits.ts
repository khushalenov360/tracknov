import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseKey);

async function verify() {
  const { data: credit, error } = await adminClient
    .from('credit_templates')
    .select('*')
    .eq('code', 'EE C5')
    .single();

  if (error) {
    console.error(error);
    return;
  }

  console.log("EE C5 Details:");
  console.log(JSON.stringify(credit, null, 2));
}

verify().catch(console.error);
