const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

const { createAdminClient } = require("../lib/supabase/admin");

async function checkSchema() {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_table_columns", { table_name: "documents" });
  
  if (error) {
    // If RPC doesn't exist, try a direct query to information_schema
    const { data: cols, error: colError } = await admin.from("information_schema.columns").select("column_name").eq("table_name", "documents");
    if (colError) {
        // information_schema might be restricted. Try selecting * from documents limit 0
        const { data: doc, error: docError } = await admin.from("documents").select("*").limit(1);
        if (docError) {
            console.error("Schema Check Error:", docError);
        } else {
            console.log("Columns in 'documents':", Object.keys(doc?.[0] || {}));
        }
    } else {
        console.log("Columns (inf_schema):", cols);
    }
  } else {
    console.log("Columns (RPC):", data);
  }
}

checkSchema().catch(console.error);
