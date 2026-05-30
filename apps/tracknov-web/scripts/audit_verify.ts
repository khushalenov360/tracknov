// scripts/audit_verify.ts
import { createAdminClient } from "../lib/supabase/admin";

async function verifyAuditIntegrity() {
  const supabase = createAdminClient();
  
  console.log("--- STARTING AUDIT INTEGRITY VERIFICATION ---");
  
  const { data: reviews, error: reviewError } = await supabase
    .from('document_reviews')
    .select('id, document_id, version_number, action');
    
  if (reviewError) {
    console.error("Error fetching reviews:", reviewError);
    return;
  }
  
  console.log(`Found ${reviews.length} document reviews.`);
  
  let issues = 0;
  for (const review of reviews) {
    if (review.version_number === null) {
      console.warn(`[ISSUE] Review ${review.id} for document ${review.document_id} has no version_number.`);
      issues++;
      continue;
    }
    
    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .select('id')
      .eq('document_id', review.document_id)
      .eq('version', review.version_number)
      .maybeSingle();
      
    if (versionError) {
      console.error(`Error checking version for review ${review.id}:`, versionError);
      issues++;
    } else if (!version) {
      console.warn(`[ISSUE] Review ${review.id} pins version ${review.version_number}, but this version does not exist in document_versions.`);
      issues++;
    }
  }
  
  console.log("\nAudit Integrity Verification Summary:");
  if (issues === 0) {
    console.log("✅ All reviews are correctly snapshot-bound.");
  } else {
    console.log(`❌ Found ${issues} integrity issues.`);
  }
  
  console.log("--- VERIFICATION COMPLETE ---");
}

verifyAuditIntegrity();
