import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import fs from "fs";

async function run() {
  // Use dynamic import to prevent ESM hoisting from executing admin client initialization before dotenv loads .env.local
  const { createAdminClient } = await import("../lib/supabase/admin");

  const admin = createAdminClient();
  const filePath = path.join(__dirname, "../supabase/migrations/0129_seed_igbc_templates.sql");
  const sql = fs.readFileSync(filePath, "utf8");
  
  console.log("Applying 0129_seed_igbc_templates.sql...");
  const { data, error } = await admin.rpc("exec_migrations", { sql_query: sql });
  if (error) {
    console.error("Error applying migration:", error);
  } else {
    console.log("Migration applied successfully! Result:", data);
  }
}

run().catch(console.error);
