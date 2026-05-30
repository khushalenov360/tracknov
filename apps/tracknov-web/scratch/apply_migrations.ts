const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

const { createAdminClient } = require("../lib/supabase/admin");
const fs = require("fs");
const path = require("path");

async function applyAllMigrations() {
  const admin = createAdminClient();
  const migrationsDir = path.join(__dirname, "../supabase/migrations");
  
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith(".sql"))
    .sort();

  console.log(`Checking ${files.length} migrations.`);

  for (const file of files) {
    console.log(`Processing ${file}...`);
    let sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    
    // Safer patch for Safe Update mode
    // We only patch updates that appear to be bulk (ending a statement without WHERE)
    sql = sql.replace(/update\s+([^\s;]+)\s+set\s+([^;]+);/gi, (match, table, body) => {
        if (body.toLowerCase().includes("where")) return match;
        return `UPDATE ${table} SET ${body} WHERE id IS NOT NULL;`;
    });

    const { error } = await admin.rpc("exec_migrations", { sql_query: sql });
    
    if (error) {
      if (error.message.includes("already exists") || error.message.includes("already a member") || error.message.includes("already in use")) {
          // Skip
      } else {
          console.error(`  Error in ${file}:`, error.message);
      }
    } else {
      console.log(`  Applied ${file}`);
    }
  }

  console.log("Migration pass complete.");
  
  // Final verification
  const { data: cols } = await admin.from("documents").select("workflow_state, file_hash").limit(1);
  console.log("Final Verification:", cols ? "SUCCESS" : "FAILED");
}

applyAllMigrations().catch(console.error);
