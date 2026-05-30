import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testRequirement() {
  const projectId = "1fabd316-6d0f-4de3-a149-7e23c528aab9"; // The project ID we saw earlier

  // 1. Fetch EDA C1 credit
  const { data: credit } = await supabase
    .from("project_credits")
    .select("id, credit_code, documents_required")
    .eq("project_id", projectId)
    .eq("credit_code", "EDA C1")
    .single();

  if (!credit) {
    console.error("Credit not found");
    return;
  }
  
  console.log(`Credit: ${credit.credit_code} (${credit.id})`);
  console.log("Current documents_required:");
  console.log(JSON.stringify(credit.documents_required, null, 2));

  // Simulating user changing Drawings to REQUIRED
  // The UI passes all currently required doc types + the new one
  const selectedTypesSet = new Set(["calculation_table", "drawings"]);

  const nextRequirements = ((credit.documents_required ?? []) as Array<{ type: string; label: string }>).map((item) => {
    const required = selectedTypesSet.has(item.type);
    return {
      ...item,
      required,
      requirement: required ? "Required" : "NA",
    };
  });

  console.log("\nNext documents_required:");
  console.log(JSON.stringify(nextRequirements, null, 2));

  const { error } = await supabase
    .from("project_credits")
    .update({ documents_required: nextRequirements })
    .eq("id", credit.id);

  if (error) {
    console.error("Failed to update:", error);
  } else {
    console.log("Successfully updated!");
  }
}

testRequirement();
