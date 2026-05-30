import { createAdminClient } from "@/lib/supabase/admin";
import { governanceLocalStorage } from "./governanceContext";
import { emitGovernanceEvent } from "./governanceObservabilityBus";

export interface EvidenceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  frameworkVersion: string;
  checksExecuted: string[];
}

/**
 * Authoritative evidence validation engine.
 * Enforces framework-specific mandatory evidence rules and completeness checks.
 */
export async function validateEvidence(projectId: string, evidenceId: string): Promise<EvidenceValidationResult> {
  const context = governanceLocalStorage.getStore();
  const frameworkVersion = context?.frameworkVersion || "GI_V1"; // Default to V1 if not specified
  
  const admin = createAdminClient();
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks: string[] = ["TENANT_ISOLATION", "FRAMEWORK_ALIGNMENT", "DUPLICATE_DETECTION", "STALE_CHECK"];

  // 1. Fetch Evidence and related Credit
  const { data: evidence, error: evError } = await admin
    .from("project_document")
    .select("*, project_credits(*)")
    .eq("id", evidenceId)
    .single();

  if (evError || !evidence) {
    throw new Error(`Evidence not found: ${evidenceId}`);
  }

  // 2. Tenant Isolation Check
  if (evidence.project_id !== projectId) {
    await emitGovernanceEvent({
      category: "TENANT_BOUNDARY_VIOLATION",
      severity: "critical",
      sourceLayer: "evidenceValidationEngine",
      projectId,
      payload: { evidenceId, expectedProject: projectId, actualProject: evidence.project_id }
    });
    throw new Error("CRITICAL: Tenant isolation violation during evidence validation.");
  }

  // 3. Framework-Aware Validation
  if (frameworkVersion === "GI_V2") {
    // GI V2 specific rules (e.g., mandatory metadata, cryptographic hashes)
    if (!evidence.file_hash) {
      errors.push("GI_V2 requirement: Cryptographic file hash is missing.");
    }
    if (!evidence.doc_category) {
      errors.push("GI_V2 requirement: Document category classification is mandatory.");
    }
  } else {
    // GI V1 specific rules
    if (!evidence.file_name) {
      errors.push("GI_V1 requirement: File name is mandatory.");
    }
  }

  // 4. Duplicate Detection (Simplified for this orchestrator)
  if (evidence.file_hash) {
    const { count } = await admin
      .from("project_document")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("file_hash", evidence.file_hash)
      .neq("id", evidenceId);
      
    if (count && count > 0) {
      warnings.push(`Potential duplicate detected: ${count} other documents share this hash.`);
    }
  }

  // 5. Stale Evidence Check
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  if (new Date(evidence.uploaded_at) < oneYearAgo) {
    warnings.push("Evidence is more than 1 year old and may be stale.");
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    frameworkVersion,
    checksExecuted: checks,
  };
}
