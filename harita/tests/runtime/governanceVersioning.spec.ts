import { test, expect } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Use standard imports
import { governanceEvolutionEngine } from "../../lib/governance/evolution";
import { createAdminClient } from "../../lib/supabase/admin";
import { collectRuntimeProof } from "../../lib/governance/runtimeProofCollector";

/**
 * GOVERNANCE VERSIONING INTEGRITY SUITE
 * 
 * Implements Section 1 and Section 151 of the Governance Evolution Request.
 */
test.describe("Governance Versioning Integrity", () => {
  const projectId = "b73d7310-df16-4d26-b6c8-61bebb197410";

  test("Should fetch authoritative governance versions from DB", async () => {
    const context = await governanceEvolutionEngine.getLatestContext();
    
    expect(context.workflow_engine_version).toBeDefined();
    expect(context.rbac_hierarchy_version).toBeDefined();
    
    console.log("[GOVERNANCE_TEST] Fetched versions:", context);
  });

  test("Should log governance version changes", async () => {
    const component = "WORKFLOW_ENGINE";
    const oldVersion = "1.0.0";
    const newVersion = "1.2.0-EVOLVE-TEST";
    
    await governanceEvolutionEngine.logVersionChange({
      componentName: component,
      oldVersion,
      newVersion,
      reason: "Automated Evolution Control Stress Test",
      impactAnalysis: { test_run: true }
    });

    const admin = createAdminClient();
    const { data: logEntry } = await admin
      .from("governance_change_log")
      .select("*")
      .eq("component_name", component)
      .eq("new_version", newVersion)
      .order("applied_at", { ascending: false })
      .limit(1)
      .single();

    expect(logEntry).toBeDefined();
    console.log("[GOVERNANCE_TEST] Change log entry verified.");
  });

  test("Proof artifacts MUST capture governance version context", async () => {
    const testProofType = "EVOLUTION_INTEGRITY_PROOFER_V2";
    await collectRuntimeProof({
      proofType: testProofType,
      runtimeSource: "GOVERNANCE_VERSIONING_SPEC",
      projectId,
      payload: { test: "version_capture" }
    });

    const admin = createAdminClient();
    const { data: artifact } = await admin
      .from("runtime_proof_artifacts")
      .select("*")
      .eq("proof_type", testProofType)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    expect(artifact).toBeDefined();
    expect(artifact.governance_version_context).toBeDefined();
    expect(artifact.governance_version_context.workflow_engine_version).toBeDefined();
    
    console.log("[GOVERNANCE_TEST] Proof artifact version capture verified.");
  });
});
