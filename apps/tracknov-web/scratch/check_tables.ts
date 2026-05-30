const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });
const { createAdminClient } = require("../lib/supabase/admin");

async function checkTables() {
  const admin = createAdminClient();
  const tables = ["client_token_transactions", "activity_logs", "rating_systems"];
  for (const table of tables) {
    const { data, error } = await admin.from(table).select("*").limit(0);
    console.log(`Table '${table}' exists:`, !error);
    if (error) console.log(`  Error: ${error.message}`);
  }
}

checkTables().catch(console.error);
