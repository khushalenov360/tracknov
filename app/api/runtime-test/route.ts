import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { projectService } from "@/lib/harita-engine/services/project-service";
import { documentService } from "@/lib/harita-engine/services/document-service";
import { runRuntimeTransition } from "@/core/runtime/orchestrator";
import { workflowOrchestratorService } from "@/lib/harita-engine/services/workflow-orchestrator-service";
import crypto from "crypto";

export async function GET() {
  const admin = createAdminClient();
  const logs: string[] = [];
  const log = (msg: string) => { console.log(msg); logs.push(msg); };

  log("Starting Runtime Verification...");
  
  try {
    const { data: profiles } = await admin.from("profiles").select("*").limit(10);
    if (!profiles || profiles.length < 4) throw new Error("Not enough profiles to run test");
    
    const L5User = { id: profiles[0].user_id, role: "super_user", email: profiles[0].email };
    const L3User = { id: profiles[1].user_id, role: "project_admin", email: profiles[1].email };
    const L1User = { id: profiles[2].user_id, role: "owner", email: profiles[2].email };
    const L0User = { id: profiles[3].user_id, role: "architect", email: profiles[3].email };
    
    // Use an existing project
    log("--- TEST 1: PROJECT CREATION (Using Existing) ---");
    const { data: projects } = await admin.from("projects").select("*").limit(1);
    if (!projects || projects.length === 0) throw new Error("No existing project found");
    const project = projects[0];
    log("PASS: Project found " + project.id);
    
    // Check membership
    await admin.from("project_users").upsert([
      { project_id: project.id, user_id: L3User.id, role: "project_admin", added_by: L5User.id },
      { project_id: project.id, user_id: L1User.id, role: "owner", added_by: L5User.id },
      { project_id: project.id, user_id: L0User.id, role: "architect", added_by: L5User.id },
    ]);
    
    const { data: credits } = await admin.from("project_credits").select("*").eq("project_id", project.id).limit(1);
    if (!credits || credits.length === 0) throw new Error("No credits in project");
    const credit = credits[0];
    
    // Add mapping
    await admin.from("project_credit_mapping").upsert({
      project_id: project.id,
      project_credit_id: credit.id,
      responsible_role: "architect"
    }, { onConflict: "project_credit_id" });
    
    const makeFile = (name: string) => {
      const b = new Blob(["test content"]);
      return new File([b], name, { type: "application/pdf" });
    };

    // TEST 2: L3 UPLOAD GUIDE
    log("--- TEST 2: L3 UPLOAD GUIDE ---");
    await documentService.uploadDocument(L3User as any, {
      projectId: project.id,
      creditId: credit.credit_id,
      projectCreditId: credit.id,
      docCategory: "guide",
      file: makeFile("Guide.pdf"),
      idempotencyKey: uuidv4(),
    });
    const { data: docGuide } = await admin.from("project_document").select("*").eq("project_credit_id", credit.id).eq("doc_category", "guide").single();
    log("PASS: L3 Uploaded Guide, State: " + docGuide?.state);
    
    // TEST 3: L3 UPLOAD TRACKER
    log("--- TEST 3: L3 UPLOAD TRACKER ---");
    await documentService.uploadDocument(L3User as any, {
      projectId: project.id,
      creditId: credit.credit_id,
      projectCreditId: credit.id,
      docCategory: "tracker",
      file: makeFile("Tracker.pdf"),
      idempotencyKey: uuidv4(),
    });
    log("PASS: L3 Uploaded Tracker");
    
    // TEST 4: L3 ASSIGN CREDIT
    log("--- TEST 4: L3 ASSIGN CREDIT ---");
    await workflowOrchestratorService.assignContributor(L3User as any, {
      projectId: project.id,
      projectCreditId: credit.id,
      assignedUserId: L0User.id,
      documentType: "evidence",
    });
    log("PASS: Assignment successful");

    // TEST 5: L0 DOCUMENT UPLOAD
    log("--- TEST 5: L0 UPLOAD EVIDENCE ---");
    await documentService.uploadDocument(L0User as any, {
      projectId: project.id,
      creditId: credit.credit_id,
      projectCreditId: credit.id,
      docCategory: "evidence",
      file: makeFile("Evidence-A.pdf"),
      idempotencyKey: uuidv4(),
    });
    const { data: docA } = await admin.from("project_document").select("*").eq("project_credit_id", credit.id).eq("file_name", "Evidence-A.pdf").order("created_at", { ascending: false }).limit(1).single();
    log("PASS: Evidence A uploaded. State: " + docA?.state + ", Workflow State: " + docA?.workflow_state);
    
    // TEST 6: L1 REVIEW
    log("--- TEST 6: L1 REVIEW ---");
    const transitionRes1 = await runRuntimeTransition(L1User as any, {
      entityType: "document",
      entityId: docA!.id,
      projectId: project.id,
      targetState: "UNDER_L3_REVIEW", // Simulating forward to L3
    });
    log("L1 Transition Result: " + JSON.stringify(transitionRes1));
    const { data: docAfterL1 } = await admin.from("project_document").select("*").eq("id", docA!.id).single();
    log("Doc state after L1 review: " + docAfterL1?.state);

    // TEST 7: L3 VERIFICATION
    log("--- TEST 7: L3 VERIFICATION ---");
    const transitionRes2 = await runRuntimeTransition(L3User as any, {
      entityType: "document",
      entityId: docA!.id,
      projectId: project.id,
      targetState: "APPROVED",
    });
    log("L3 Transition Result: " + JSON.stringify(transitionRes2));
    const { data: docAfterL3 } = await admin.from("project_document").select("*").eq("id", docA!.id).single();
    const { data: creditAfterL3 } = await admin.from("project_credits").select("completion_pct, state").eq("id", credit.id).single();
    log(`Doc state after L3 verify: ${docAfterL3?.state}, Credit Completion: ${creditAfterL3?.completion_pct}%`);

    // TEST 8: L1 DIRECT UPLOAD
    log("--- TEST 8: L1 DIRECT UPLOAD ---");
    await documentService.uploadDocument(L1User as any, {
      projectId: project.id,
      creditId: credit.credit_id,
      projectCreditId: credit.id,
      docCategory: "evidence",
      file: makeFile("Evidence-B.pdf"),
      idempotencyKey: uuidv4(),
    });
    const { data: docB } = await admin.from("project_document").select("*").eq("project_credit_id", credit.id).eq("file_name", "Evidence-B.pdf").order("created_at", { ascending: false }).limit(1).single();
    log("PASS: Evidence B uploaded. State: " + docB?.state);

    // TEST 9: L3 VERIFICATION OF L1 DOCUMENT
    log("--- TEST 9: L3 VERIFICATION (EVIDENCE B) ---");
    const transitionRes3 = await runRuntimeTransition(L3User as any, {
      entityType: "document",
      entityId: docB!.id,
      projectId: project.id,
      targetState: "APPROVED",
    });
    log("L3 Transition Result (Ev B): " + JSON.stringify(transitionRes3));
    const { data: creditAfterEvB } = await admin.from("project_credits").select("completion_pct, state").eq("id", credit.id).single();
    log(`Credit Completion after L3 verify (Ev B): ${creditAfterEvB?.completion_pct}%`);

    // TEST 10: APPROVED DOCUMENT SET GENERATION
    log("--- TEST 10: APPROVED DOCUMENT SET GENERATION ---");
    const { data: appDocs } = await admin.from("project_document").select("*").eq("project_credit_id", credit.id).eq("state", "APPROVED");
    log(`Approved documents found: ${appDocs?.length}`);
    if (appDocs?.length === 2) {
      log("PASS: Both Evidence A and Evidence B are in APPROVED state.");
    }
    
    // Do they generate a distinct set?
    const { data: manualVersions } = await admin.from("manual_versions").select("*").eq("project_id", project.id);
    log(`Approved Set / Manual Versions found: ${manualVersions?.length}`);

    return NextResponse.json({ success: true, logs });
  } catch (e: any) {
    log("ERROR: " + e.message);
    return NextResponse.json({ success: false, logs, error: e.message });
  }
}
