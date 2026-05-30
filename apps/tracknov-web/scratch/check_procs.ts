const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

const { createAdminClient } = require("../lib/supabase/admin");

async function checkProcs() {
  const admin = createAdminClient();
  const { data, error } = await admin.from("pg_proc").select("proname").ilike("proname", "%exec%");
  if (error) console.error(error);
  else console.log(data);
}

checkProcs().catch(console.error);
