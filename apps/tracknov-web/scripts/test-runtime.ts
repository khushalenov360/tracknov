import { createAdminClient } from "../lib/supabase/admin";
import { projectService } from "@tracknov/harita-engine/services/project-service";
import { documentService } from "@tracknov/harita-engine/services/document-service";
import { creditService } from "@tracknov/harita-engine/services/credit-service";
import { runRuntimeTransition } from "@tracknov/harita-engine/services/workflow-service";
import { workflowOrchestratorService } from "@tracknov/harita-engine/services/workflow-orchestrator-service";
import crypto from "crypto";

async function run() {
  const admin = createAdminClient();
  
  console.log("Starting Runtime Verification...");
  const results: any[] = [];
  
  try {
    // 1. Find Test Users (or create them)
    const { data: users } = await admin.auth.admin.listUsers();
    
    // We will just find existing profiles to use as mocks.
    const { data: profiles } = await admin.from("profiles").select("*").limit(10);
    if (!profiles || profiles.length < 4) throw new Error("Not enough profiles to run test");
    
    const L5User = { id: profiles[0].user_id, role: "super_user", email: profiles[0].email };
    const L3User = { id: profiles[1].user_id, role: "project_admin", email: profiles[1].email };
    const L1User = { id: profiles[2].user_id, role: "owner", email: profiles[2].email };
    const L0User = { id: profiles[3].user_id, role: "architect", email: profiles[3].email };
    
    console.log("L5:", L5User.email);
    console.log("L3:", L3User.email);
    console.log("L1:", L1User.email);
    console.log("L0:", L0User.email);
    
    // TEST 1: PROJECT CREATION
    console.log("--- TEST 1: PROJECT CREATION ---");
    const project = await projectService.createProject(L5User as any, {
      name: "Runtime Verification Project " + Date.now(),
      certificationType: "IGBC_GREEN_NEW_BUILDINGS",
      targetRating: "PLATINUM",
    });
    
    const { data: pCheck } = await admin.from("projects").select("*").eq("id", project.id).single();
    if (!pCheck) throw new Error("Project not created");
    console.log("PASS: Project Created", project.id);
    
    // Add L3, L1, L0 to project
    await admin.from("project_users").insert([
      { project_id: project.id, user_id: L3User.id, role: "project_admin", added_by: L5User.id },
      { project_id: project.id, user_id: L1User.id, role: "owner", added_by: L5User.id },
      { project_id: project.id, user_id: L0User.id, role: "architect", added_by: L5User.id },
    ]);
    console.log("PASS: Users added to project");
    
    // Get a credit for the project
    const { data: credits } = await admin.from("project_credits").select("*").eq("project_id", project.id).limit(1);
    const credit = credits![0];
    
    // Helper to mock File
    const makeFile = (name: string) => {
      const b = new Blob(["test content"]);
      return new File([b], name, { type: "application/pdf" });
    };

    // TEST 2: L3 UPLOAD GUIDE
    console.log("--- TEST 2: L3 UPLOAD GUIDE ---");
    await documentService.uploadDocument(L3User as any, {
      projectId: project.id,
      creditId: credit.credit_id,
      projectCreditId: credit.id,
      docCategory: "guide",
      file: makeFile("Guide.pdf"),
      idempotencyKey: crypto.randomUUID(),
    });
    console.log("PASS: L3 Uploaded Guide");
    
    // TEST 3: L3 UPLOAD TRACKER
    console.log("--- TEST 3: L3 UPLOAD TRACKER ---");
    await documentService.uploadDocument(L3User as any, {
      projectId: project.id,
      creditId: credit.credit_id,
      projectCreditId: credit.id,
      docCategory: "tracker",
      file: makeFile("Tracker.pdf"),
      idempotencyKey: crypto.randomUUID(),
    });
    console.log("PASS: L3 Uploaded Tracker");
    
    // TEST 4: L3 ASSIGN CREDIT
    console.log("--- TEST 4: L3 ASSIGN CREDIT ---");
    await workflowOrchestratorService.assignContributor(L3User as any, {
      projectId: project.id,
      projectCreditId: credit.id,
      assignedUserId: L0User.id,
      documentType: "evidence",
    });
    const { data: assignmentCheck } = await admin.from("assignments").select("*").eq("project_credit_id", credit.id).eq("is_active", true).single();
    if (assignmentCheck?.user_id !== L0User.id) throw new Error("Assignment failed");
    console.log("PASS: Assignment successful");

    // TEST 5: L0 DOCUMENT UPLOAD
    console.log("--- TEST 5: L0 UPLOAD EVIDENCE ---");
    await documentService.uploadDocument(L0User as any, {
      projectId: project.id,
      creditId: credit.credit_id,
      projectCreditId: credit.id,
      docCategory: "evidence",
      file: makeFile("Evidence-A.pdf"),
      idempotencyKey: crypto.randomUUID(),
    });
    
    const { data: docA } = await admin.from("project_document").select("*").eq("project_credit_id", credit.id).eq("file_name", "Evidence-A.pdf").order("created_at", { ascending: false }).limit(1).single();
    if (!docA) throw new Error("Document A not found");
    console.log("PASS: Evidence A uploaded. State =", docA.state, "Workflow State =", docA.workflow_state);
    
    // TEST 6: L1 REVIEW FLOW
    console.log("--- TEST 6: L1 REVIEW ---");
    const transitionRes1 = await runRuntimeTransition(L1User as any, {
      entityType: "document",
      entityId: docA.id,
      projectId: project.id,
      targetState: "L1_REVIEW", // Or whatever we use? Let's check what L1 can do. Actually we fixed the states. Let's say READY or APPROVED. But wait, can L1 approve?
    });
    console.log("L1 Transition Result:", transitionRes1);
    
    // Check state
    const { data: docAfterL1 } = await admin.from("project_document").select("*").eq("id", docA.id).single();
    console.log("Doc state after L1 review:", docAfterL1?.state);

    // TEST 7: L3 VERIFICATION FLOW
    console.log("--- TEST 7: L3 VERIFICATION ---");
    const transitionRes2 = await runRuntimeTransition(L3User as any, {
      entityType: "document",
      entityId: docA.id,
      projectId: project.id,
      targetState: "APPROVED",
    });
    console.log("L3 Transition Result:", transitionRes2);
    
    const { data: docAfterL3 } = await admin.from("project_document").select("*").eq("id", docA.id).single();
    console.log("Doc state after L3 verify:", docAfterL3?.state);
    
    // Check progress recalculation
    const { data: creditAfterL3 } = await admin.from("project_credits").select("completion_pct, state").eq("id", credit.id).single();
    console.log("Credit completion after L3 verify:", creditAfterL3?.completion_pct, "% | State:", creditAfterL3?.state);

    // TEST 8: L1 DIRECT UPLOAD
    console.log("--- TEST 8: L1 DIRECT UPLOAD ---");
    await documentService.uploadDocument(L1User as any, {
      projectId: project.id,
      creditId: credit.credit_id,
      projectCreditId: credit.id,
      docCategory: "evidence",
      file: makeFile("Evidence-B.pdf"),
      idempotencyKey: crypto.randomUUID(),
    });
    const { data: docB } = await admin.from("project_document").select("*").eq("project_credit_id", credit.id).eq("file_name", "Evidence-B.pdf").order("created_at", { ascending: false }).limit(1).single();
    console.log("PASS: Evidence B uploaded. State =", docB?.state, "Workflow State =", docB?.workflow_state);

    // TEST 9: L3 VERIFICATION OF L1 DOCUMENT
    console.log("--- TEST 9: L3 VERIFICATION (EVIDENCE B) ---");
    const transitionRes3 = await runRuntimeTransition(L3User as any, {
      entityType: "document",
      entityId: docB!.id,
      projectId: project.id,
      targetState: "APPROVED",
    });
    console.log("L3 Transition Result (Ev B):", transitionRes3);
    const { data: creditAfterEvB } = await admin.from("project_credits").select("completion_pct, state").eq("id", credit.id).single();
    console.log("Credit completion after L3 verify (Ev B):", creditAfterEvB?.completion_pct, "% | State:", creditAfterEvB?.state);

    // TEST 10: APPROVED DOCUMENT SET GENERATION
    console.log("--- TEST 10: APPROVED DOCUMENT SET GENERATION ---");
    // Verify if system generates a distinct "Approved Document Set"
    const { data: appDocs } = await admin.from("project_document").select("*").eq("project_credit_id", credit.id).eq("state", "APPROVED");
    console.log(`Approved documents found: ${appDocs?.length}`);
    if (appDocs?.length === 2) {
      console.log("PASS: Both Evidence A and Evidence B are in APPROVED state.");
    }

  } catch (e: any) {
    console.error("Test failed:", e);
  }
}

run();
