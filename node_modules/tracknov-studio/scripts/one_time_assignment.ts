import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Starting one-time document assignment...");

  // 1. Get all projects
  const { data: projects } = await supabase.from("projects").select("id, name");
  if (!projects) return console.log("No projects found.");

  for (const project of projects) {
    console.log(`Processing project: ${project.name}`);

    // 2. Get members of this project to find the target roles
    const { data: members } = await supabase
      .from("project_users")
      .select("user_id, role")
      .eq("project_id", project.id);

    if (!members) continue;

    const pm = members.find(m => m.role === "project_manager")?.user_id;
    const contractor = members.find(m => m.role === "contractor")?.user_id;
    const architect = members.find(m => m.role === "architect")?.user_id;
    const mepcon = members.find(m => m.role === "mep")?.user_id;

    // 3. Get all credits for this project
    const { data: credits } = await supabase
      .from("project_credits")
      .select("id, documents_required")
      .eq("project_id", project.id);

    if (!credits) continue;

    for (const credit of credits) {
      if (!credit.documents_required || !Array.isArray(credit.documents_required)) continue;

      let updated = false;
      const newDocs = credit.documents_required.map((doc: any) => {
        let targetUser = null;
        const type = String(doc.type || "").toLowerCase();
        const label = String(doc.label || "").toLowerCase();

        if (type.includes("narrative") || label.includes("narrative")) {
          targetUser = pm;
        } else if (type.includes("photo") || type.includes("video") || label.includes("photo") || label.includes("video")) {
          targetUser = contractor;
        } else if (type.includes("drawing") || label.includes("drawing") || label.includes("plan")) {
          targetUser = architect;
        } else if (type.includes("calculation") || label.includes("calculation") || type.includes("calc")) {
          targetUser = mepcon;
        }

        if (targetUser && doc.assigned_user_id !== targetUser) {
          doc.assigned_user_id = targetUser;
          updated = true;
        }
        return doc;
      });

      if (updated) {
        await supabase
          .from("project_credits")
          .update({ documents_required: newDocs })
          .eq("id", credit.id);
        
        console.log(`Updated credit ${credit.id} documents`);
      }
    }
  }

  console.log("Done!");
}

run().catch(console.error);
