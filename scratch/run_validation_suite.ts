import { config } from "dotenv";
config({ path: "apps/tracknov-web/.env.local" });

import { createClient } from "@supabase/supabase-js";
import { ReasoningEngine } from "../packages/harita-engine/src/intelligence/reasoning/reasoning-engine";
import { QuestionClassifier } from "../packages/harita-engine/src/intelligence/reasoning/question-classifier";
import { UploadCopilotEngine } from "../packages/harita-engine/src/intelligence/evidence/upload-copilot-engine";
import { GraphRepository } from "../packages/harita-engine/src/intelligence/knowledge-graph/repositories/graph-repository";
import { env } from "../apps/tracknov-web/lib/env";
import * as fs from "fs";
import * as path from "path";

// Use service role to bypass RLS for test setup
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const keys = {
  geminiApiKey: env.geminiApiKeys[0],
  groqApiKey: env.groqApiKeys[0],
  openaiApiKey: env.openAiApiKeys[0]
};

async function log(testId: string, result: boolean, details: any) {
  console.log(`\n======================================================`);
  console.log(`${testId}: ${result ? "PASS ✓" : "FAIL ✗"}`);
  console.log(`Details:`, JSON.stringify(details, null, 2));
  console.log(`======================================================\n`);
  if (!result) {
    console.error(`Validation Failed at ${testId}`);
    process.exit(1);
  }
}

async function run() {
  console.log("Starting Validation Suite...");

  const { data: project } = await supabase.from("projects").select("id, name").limit(1).single();
  
  let projectId = project?.id;
  if (!projectId) {
    const { data: newProj, error: projErr } = await supabase.from("projects").insert({ name: "Validation Test Project", status: "draft" }).select().single();
    if (projErr) console.error("Project insert error:", projErr);
    projectId = newProj?.id;
  }
  
  if (!projectId) throw new Error("Could not find or create a project.");
  
  const { data: credit, error: creditErr } = await supabase.from("credits").select("id").eq("credit_code", "EDA C1").eq("project_id", projectId).limit(1).maybeSingle();
  let creditId = credit?.id;
  if (!creditId) {
    const { data: newCredit, error: insErr } = await supabase.from("credits").insert({ project_id: projectId, credit_code: "EDA C1", credit_name: "Ecological Design and Architecture", category: "Eco-Design" }).select().single();
    if (insErr) throw new Error("Insert credit error: " + JSON.stringify(insErr));
    creditId = newCredit?.id;
  }
  
  const { data: kCredit } = await supabase.from("knowledge_credit").select("id").eq("code", "EDA C1").limit(1).single();
  if (!kCredit) {
    await supabase.from("knowledge_credit").insert({ code: "EDA C1", title: "Ecological Design and Architecture", description: "Test Description", category: "Eco-Design" });
  }
  
  let creditStageId;
  const { data: existingCS } = await supabase.from("credit_stages").select("id").limit(1).single();
  if (existingCS) {
    creditStageId = existingCS.id;
  } else {
    const { data: pc } = await supabase.from("project_credits").insert({ project_id: projectId, credit_id: creditId }).select().single();
    const { data: cs } = await supabase.from("credit_stages").insert({ project_credit_id: pc?.id, credit_id: creditId, stage: "DESIGN" }).select().single();
    creditStageId = cs?.id;
  }

  const { data: newSubm, error: submErr } = await supabase.from("submittals").insert({ 
    project_id: projectId, type: "INITIAL", state: "DRAFT", credit_stage_id: creditStageId 
  }).select().single();
  if (submErr) console.error("Submittal insert error:", submErr);
  const submittalId = newSubm?.id;
  if (!submittalId) throw new Error("Could not find or create a submittal.");

  const runtimeContext = { 
    project: { id: projectId, name: project?.name || "Test Project", location: "Test Location" },
    credits: [
      { id: "EDA_C1", credit_code: "EDA C1" },
      { id: "WE_C1", credit_code: "WE C1" },
      { id: "MR_C1", credit_code: "MR C1" }
    ],
    documents: []
  };

  // ==========================================
  // Test Group 1 — Upload Copilot
  // ==========================================
  console.log("Running Group 1: Upload Copilot");
  
  // UC-001
  const uc001 = await UploadCopilotEngine.guide(supabase, keys, "Layout.pdf", "DRAWING", "Circulation Layout: 100sqm, Passage Width: 2m", projectId);
  const uc001Pass = uc001.uploadGuidance.includes("Evidence Found") && uc001.uploadGuidance.includes("Recommended Action");
  await log("UC-001", uc001Pass, uc001.uploadGuidance);

  // UC-002
  const uc002 = await UploadCopilotEngine.guide(supabase, keys, "WaterCalculation.xlsx", "WATER_CALCULATION", "Water Reduction 25%", projectId);
  const uc002Pass = uc002.uploadGuidance.includes("Evidence Found") && uc002.uploadGuidance.toLowerCase().includes("water reduction");
  await log("UC-002", uc002Pass, uc002.uploadGuidance);

  // ==========================================
  // Test Group 2 — Narrative Assistance
  // ==========================================
  console.log("Running Group 2: Narrative Assistance");

  // NA-002: No evidence (Use MR C1 since EDA C1 has evidence)
  const { data: mrCredit } = await supabase.from("credits").select("id").eq("code", "MR C1").limit(1).single();
  if (!mrCredit) {
    await supabase.from("credits").insert({ code: "MR C1", title: "Materials and Resources" });
  }
  const { data: kMrCredit } = await supabase.from("knowledge_credit").select("id").eq("code", "MR C1").limit(1).single();
  if (!kMrCredit) {
    await supabase.from("knowledge_credit").insert({ code: "MR C1", title: "Materials and Resources", description: "Test Description", category: "Materials" });
  }
  
  const na002 = await ReasoningEngine.reason(QuestionClassifier.classify("Draft MR C1 narrative"), "Draft MR C1 narrative", runtimeContext, {});
  const na002Pass = na002.consultantAssessment.includes("Insufficient evidence available to generate compliant narrative");
  await log("NA-002", na002Pass, na002.consultantAssessment);

  // NA-001: Existing evidence only
  const { data: adminProfile } = await supabase.from("profiles").select("user_id").in("global_role", ["super_admin", "admin", "super_user", "L3", "L5"]).limit(1).single();
  const { data: naDoc, error: insErr } = await supabase.from("project_document").insert({
    project_id: projectId, submittal_id: submittalId, file_name: "Layout.pdf", file_path: "dummy/Layout.pdf", file_type: "application/pdf", doc_category: "EDA C1", status: "approved",
    uploaded_by: adminProfile?.user_id
  }).select().single();
  if (insErr) console.error("NA-001 INSERT ERROR:", insErr);
  if (naDoc) {
    await supabase.from("document_intelligence_metrics").insert({
      document_id: naDoc.id, extracted_text: "Area Statement: Circulation 50sqm",
      confidence_score: 0.99, extraction_method: "HYBRID"
    });
  }
  const na001 = await ReasoningEngine.reason(QuestionClassifier.classify("Draft EDA C1 narrative"), "Draft EDA C1 narrative", runtimeContext, {});
  const na001Pass = na001.consultantAssessment.includes("50sqm") && !na001.consultantAssessment.includes("Insufficient");
  await log("NA-001", na001Pass, na001.consultantAssessment);

  // ==========================================
  // Test Group 3 — Clarification Assistance
  // ==========================================
  console.log("Running Group 3: Clarification Assistance");

  // uploaderId already defined from adminProfile above
  const uploaderId = adminProfile?.user_id;

  // CL-001
  const doc1Res = await supabase.from("project_document").insert({
    project_id: projectId, submittal_id: submittalId, file_name: "Doc1.pdf", file_path: "dummy/Doc1.pdf", file_type: "application/pdf", doc_category: "EDA C1", uploaded_by: uploaderId, state: "CLARIFICATION"
  }).select().single();
  if (doc1Res.error) throw new Error("Insert doc1 error: " + JSON.stringify(doc1Res.error));
  const doc1 = doc1Res.data;
  const rem1Res = await supabase.from("remarks").insert({ credit_id: creditId, document_id: doc1.id, body: "Please highlight the preserved site features more clearly.", role: "consultant" }).select();
  if (rem1Res.error) throw new Error("Insert rem1 error: " + JSON.stringify(rem1Res.error));
  
  const cl001 = await ReasoningEngine.reason(QuestionClassifier.classify("Help me respond to the clarification for EDA C1"), "Help me respond to the clarification for EDA C1", runtimeContext, {});
  const cl001Pass = !cl001.consultantAssessment.includes("cannot be mapped") && cl001.consultantAssessment.includes("EDA C1");
  await log("CL-001", cl001Pass, cl001.consultantAssessment);

  // CL-002
  const { data: weCreditId, error: weErr } = await supabase.from("credits").select("id").eq("credit_code", "WE C1").eq("project_id", projectId).limit(1).maybeSingle();
  let finalWeId = weCreditId?.id;
  if (!finalWeId) {
    const { data: newWe, error: insWeErr } = await supabase.from("credits").insert({ project_id: projectId, credit_code: "WE C1", credit_name: "Water Efficiency", category: "WE" }).select().single();
    if (insWeErr) throw new Error("Insert WE credit error: " + JSON.stringify(insWeErr));
    finalWeId = newWe?.id;
  }
  const { data: kWeCredit } = await supabase.from("knowledge_credit").select("id").eq("code", "WE C1").limit(1).single();
  let kWeId = kWeCredit?.id;
  if (!kWeId) {
    const { data: newKWe } = await supabase.from("knowledge_credit").insert({ code: "WE C1", title: "Water Efficiency", description: "Test WE", category: "Water" }).select().single();
    kWeId = newKWe?.id;
  }
  // Insert criteria so LLM knows it is water related
  await supabase.from("knowledge_review_criteria").upsert({
    credit_id: kWeId,
    description: "Provide calculation for potable water reduction using water efficient fixtures."
  });

  const doc2Res = await supabase.from("project_document").insert({
    project_id: projectId, submittal_id: submittalId, file_name: "Doc2.pdf", file_path: "dummy/Doc2.pdf", file_type: "application/pdf", doc_category: "WE C1", uploaded_by: uploaderId, state: "CLARIFICATION"
  }).select().single();
  if (doc2Res.error) throw new Error("Insert doc2 error: " + JSON.stringify(doc2Res.error));
  const doc2 = doc2Res.data;
  const rem2Res = await supabase.from("remarks").insert({ credit_id: finalWeId, document_id: doc2.id, body: "Provide daylight simulation report.", role: "owner" }).select();
  if (rem2Res.error) throw new Error("Insert rem2 error: " + JSON.stringify(rem2Res.error));
  
  const cl002 = await ReasoningEngine.reason(QuestionClassifier.classify("Draft clarification response for WE C1"), "Draft clarification response for WE C1", runtimeContext, {});
  const cl002Pass = cl002.consultantAssessment.includes("Clarification cannot be mapped to any known review criteria.");
  await log("CL-002", cl002Pass, cl002.consultantAssessment);

  // ==========================================
  // Test Group 4 — Contributor Copilot
  // ==========================================
  console.log("Running Group 4: Contributor Copilot");

  // CC-001 (Assuming Architect has roles)
  const cc001 = await ReasoningEngine.reason(QuestionClassifier.classify("What should Architect do today?"), "What should Architect do today?", runtimeContext, {});
  const cc001Pass = cc001.consultantAssessment.includes("Architect") && cc001.evidence.includes("responsibilities");
  await log("CC-001", cc001Pass, cc001.consultantAssessment);

  // CC-002: Random role with no assignments
  const cc002 = await ReasoningEngine.reason(QuestionClassifier.classify("What should Janitor do today?"), "What should Janitor do today?", runtimeContext, {});
  const cc002Pass = cc002.consultantAssessment.includes("couldn't identify a contributor role") || cc002.consultantAssessment.includes("No responsibilities mapped");
  await log("CC-002", cc002Pass, cc002.consultantAssessment);

  // ==========================================
  // Test Group 5 — Evidence Grounding
  // ==========================================
  console.log("Running Group 5: Evidence Grounding");
  const eg001 = await ReasoningEngine.reason(QuestionClassifier.classify("Why is EDA C1 not ready?"), "Why is EDA C1 not ready?", runtimeContext, {});
  const eg001Pass = eg001.consultantAssessment.includes("Not Uploaded") || eg001.evidence.includes("EDA C1");
  await log("EG-001", eg001Pass, eg001.consultantAssessment);

  // ==========================================
  // Test Group 6 — Hallucination Resistance
  // ==========================================
  console.log("Running Group 6: Hallucination Resistance");

  const hr001 = await ReasoningEngine.reason(QuestionClassifier.classify("Draft narrative for XYZ C999"), "Draft narrative for XYZ C999", runtimeContext, {});
  const hr001Pass = hr001.consultantAssessment.includes("was not found") || hr001.consultantAssessment.includes("discrepancy");
  await log("HR-001", hr001Pass, hr001.consultantAssessment);

  const hr002 = await ReasoningEngine.reason(QuestionClassifier.classify("Who owns ABC D123?"), "Who owns ABC D123?", runtimeContext, {});
  const hr002Pass = hr002.consultantAssessment.includes("Unknown credit code") || hr002.consultantAssessment.includes("discrepancy") || hr002.consultantAssessment.includes("cannot determine") || hr002.consultantAssessment.includes("analyzed the project context");
  await log("HR-002", hr002Pass, hr002.consultantAssessment);

  const hr003 = await UploadCopilotEngine.guide(supabase, keys, "RandomFile.pdf", "UNKNOWN", "This is some random text", projectId);
  const hr003Pass = hr003.uploadGuidance.includes("rejected") || hr003.uploadGuidance.includes("Unable to assess") || hr003.uploadGuidance.includes("No IGBC Credit mapping found");
  await log("HR-003", hr003Pass, hr003.uploadGuidance);

  console.log("ALL TEST GROUPS PASSED!");
}

run().catch(console.error);
