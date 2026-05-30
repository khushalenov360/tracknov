import { createAdminClient } from "../supabase/admin";
import { logAiRecommendation } from "../telemetry/aiRuntimeAuditLogger";

/**
 * TRACKNOV AI DUPLICATE EVIDENCE ENGINE
 * 
 * Detects duplicate or near-duplicate uploads to maintain registry purity.
 */
export async function detectDuplicates(projectId: string, newDocumentId: string, hash: string) {
  const admin = createAdminClient();

  // 1. Check for exact hash match (Registry level)
  const { data: exactMatch } = await admin
    .from("project_document")
    .select("id")
    .eq("project_id", projectId)
    .eq("hash", hash)
    .neq("id", newDocumentId)
    .limit(1);

  if (exactMatch && exactMatch.length > 0) {
    const duplicateReport = {
      documentA: newDocumentId,
      documentB: exactMatch[0].id,
      similarity: 1.0,
      type: "EXACT_HASH_MATCH"
    };

    await admin.from("ai_duplicate_evidence_reports").insert({
      project_id: projectId,
      document_a_id: duplicateReport.documentA,
      document_b_id: duplicateReport.documentB,
      similarity_score: duplicateReport.similarity,
      detection_details: duplicateReport,
      trace_id: crypto.randomUUID(),
      causality_chain_id: crypto.randomUUID()
    });

    await logAiRecommendation({
      projectId,
      recommendationType: "DUPLICATE_DETECTION",
      payload: duplicateReport,
      reasoning: "Exact hash collision detected in project registry."
    });

    return duplicateReport;
  }

  return null;
}
