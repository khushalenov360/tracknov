const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

const { createAdminClient } = require("../lib/supabase/admin");
const { transitionDocumentState } = require("../lib/services/document-state-service");

async function testWorkflow() {
  const admin = createAdminClient();
  
  // Query all documents to be sure
  const { data: docs, error: queryError } = await admin.from("documents").select("id, workflow_state, file_name");
  if (queryError) {
    console.error("Query Error:", queryError);
    return;
  }
  
  console.log("Documents in DB:", docs.map(d => `${d.file_name} (${d.id}) - ${d.workflow_state}`));

  if (!docs.length) return;

  const doc = docs[0];
  const docId = doc.id;
  
  console.log(`Testing transition for: ${doc.file_name} (${docId})`);

  // 1. Try an INVALID transition
  const nextState = doc.workflow_state === "APPROVED" ? "DRAFT" : "APPROVED"; 
  // APPROVED -> DRAFT is invalid.
  // Others -> APPROVED might be valid but let's pick one that is DEFINITELY invalid.
  // E.g. anything to DRAFT (except READY -> DRAFT is not in map, but DRAFT -> READY is)
  
  console.log(`Attempting invalid transition: ${doc.workflow_state} -> DRAFT...`);
  const invalidResult = await transitionDocumentState(admin, {
    documentId: docId,
    newState: "DRAFT",
    actorRole: "architect", 
    userId: "qa-tester"
  });
  console.log("Invalid Transition Result:", invalidResult.ok ? "PASS (Wait, this should FAIL)" : `FAIL (Expected: ${invalidResult.error})`);

  // 2. Try an UNAUTHORIZED transition (If not APPROVED, try to APPROVE as architect)
  if (doc.workflow_state !== "APPROVED") {
      console.log(`Attempting unauthorized transition: ${doc.workflow_state} -> APPROVED as architect...`);
      const unauthorizedResult = await transitionDocumentState(admin, {
        documentId: docId,
        newState: "APPROVED",
        actorRole: "architect",
        userId: "qa-tester"
      });
      console.log("Unauthorized Transition Result:", unauthorizedResult.ok ? "PASS (Wait, this should FAIL)" : `FAIL (Expected: ${unauthorizedResult.error})`);
  }
}

testWorkflow().catch(console.error);
