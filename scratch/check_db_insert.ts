import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: "apps/tracknov-web/.env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: docs } = await supabase.from("project_document").select("*").in("state", ["CLARIFICATION"]);
  console.log("CLARIFICATION docs:", docs?.map(d => ({ id: d.id, file: d.file_name, cat: d.doc_category, state: d.state })));
  
  if (docs && docs.length > 0) {
    for (const d of docs) {
       const res = await supabase.from("remarks").insert({ document_id: d.id, body: "Missing circulation calculations.", role: "consultant" });
       console.log(`Insert for ${d.id}:`, res.error);
    }
  }
}

check().catch(console.error);
