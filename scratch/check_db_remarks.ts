import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: "apps/tracknov-web/.env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: remarks, error } = await supabase.from("remarks").select("*").order("created_at", { ascending: false }).limit(10);
  console.log("remarks:", remarks, error);
}

check().catch(console.error);
