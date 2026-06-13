import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseKey);

async function download() {
  const { data, error } = await adminClient.storage
    .from('project-documents')
    .download('1fabd316-6d0f-4de3-a149-7e23c528aab9/guidebooks/1779861990562-aac41aec-60d4-4983-b91a-9a3ee4b36312-IGBC_Green_Interiors_Reference_Guide_2021__with_Addendum_.pdf');
    
  if (error) {
    console.error(error);
    return;
  }
  
  const buffer = Buffer.from(await data.arrayBuffer());
  fs.writeFileSync('scratch/user_uploaded_guidebook.pdf', buffer);
  console.log("Downloaded to scratch/user_uploaded_guidebook.pdf");
}
download();
