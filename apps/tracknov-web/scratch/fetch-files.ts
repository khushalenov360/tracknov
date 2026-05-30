import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Initialize Supabase using env vars from the codebase
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // use service role

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching latest guidebook...");
  const { data: guidebooks, error: err1 } = await supabase
    .from("project_guidebooks")
    .select("file_path, project_id, file_name")
    .order("created_at", { ascending: false })
    .limit(1);

  if (err1) console.error("Guidebook Error:", err1);
  else if (guidebooks?.length) {
    console.log("Found Guidebook:", guidebooks[0]);
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("project-documents")
      .download(guidebooks[0].file_path);
      
    if (dlErr) console.error(dlErr);
    else if (fileData) {
      const buffer = Buffer.from(await fileData.arrayBuffer());
      fs.writeFileSync(`scratch/${guidebooks[0].file_name}`, buffer);
      console.log(`Saved ${guidebooks[0].file_name}`);
    }
  }

  console.log("Fetching latest datatable...");
  const { data: tables, error: err2 } = await supabase
    .from("project_data_tables")
    .select("file_path, project_id, file_name")
    .order("created_at", { ascending: false })
    .limit(1);

  if (err2) console.error("Datatable Error:", err2);
  else if (tables?.length) {
    console.log("Found Datatable:", tables[0]);
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("project-documents")
      .download(tables[0].file_path);
      
    if (dlErr) console.error(dlErr);
    else if (fileData) {
      const buffer = Buffer.from(await fileData.arrayBuffer());
      fs.writeFileSync(`scratch/${tables[0].file_name}`, buffer);
      console.log(`Saved ${tables[0].file_name}`);
    }
  }
}

main().catch(console.error);
