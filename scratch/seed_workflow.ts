import { createAdminClient } from "../apps/tracknov-web/lib/supabase/admin";

async function run() {
  const supabase = createAdminClient();
  
  // Ensure WE C1 and EDA C1 exist
  const { data: credits } = await supabase.from("knowledge_credit").select("id, code").in("code", ["WE C1", "EDA C1"]);
  const weC1 = credits?.find((c: any) => c.code === "WE C1")?.id;
  const edaC1 = credits?.find((c: any) => c.code === "EDA C1")?.id;

  // Ensure WATER_CALCULATION and DRAWING exist
  const { data: evTypes } = await supabase.from("knowledge_evidence_type").select("id, name").in("name", ["WATER_CALCULATION", "DRAWING"]);
  const waterCalc = evTypes?.find((e: any) => e.name === "WATER_CALCULATION")?.id;
  const drawing = evTypes?.find((e: any) => e.name === "DRAWING")?.id;

  // Ensure Roles exist
  const { data: roles } = await supabase.from("workflow_role").select("id, name").in("name", ["MEP Consultant", "Architect"]);
  const mep = roles?.find((r: any) => r.name === "MEP Consultant")?.id;
  const arch = roles?.find((r: any) => r.name === "Architect")?.id;

  if (weC1 && waterCalc && mep) {
    await supabase.from("workflow_document_responsibility").upsert({
      credit_id: weC1,
      evidence_type_id: waterCalc,
      role_id: mep,
      action: "UPLOAD"
    }, { onConflict: "credit_id,evidence_type_id,role_id" });
  }

  if (edaC1 && drawing && arch) {
    await supabase.from("workflow_document_responsibility").upsert({
      credit_id: edaC1,
      evidence_type_id: drawing,
      role_id: arch,
      action: "UPLOAD"
    }, { onConflict: "credit_id,evidence_type_id,role_id" });
  }

  if (weC1 && waterCalc) {
    await supabase.from("knowledge_evidence_credit_mapping").upsert({
      credit_id: weC1,
      evidence_type_id: waterCalc
    }, { onConflict: "credit_id,evidence_type_id" });
  }

  if (edaC1 && drawing) {
    await supabase.from("knowledge_evidence_credit_mapping").upsert({
      credit_id: edaC1,
      evidence_type_id: drawing
    }, { onConflict: "credit_id,evidence_type_id" });
  }
  // For WE C1 -> "Water Reduction %"
  if (weC1) {
    await supabase.from("knowledge_review_criteria").upsert({
      credit_id: weC1,
      description: "Water Reduction %",
      sequence_order: 1
    }, { onConflict: "id" });
  }
  
  console.log("Seeding complete.");
}

run().catch(console.error);
