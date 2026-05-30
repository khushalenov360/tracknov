const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });
const { createAdminClient } = require("../lib/supabase/admin");

async function checkCredits() {
  const admin = createAdminClient();
  const { data } = await admin.from("credits").select("*").limit(1);
  console.log("Credits columns:", Object.keys(data?.[0] || {}));
}

checkCredits().catch(console.error);
