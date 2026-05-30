import { governanceEvolutionEngine } from "./evolution";
import { igbcScoreModel } from "@/lib/igbc-scoring";

/**
 * RUNTIME COMPATIBILITY VALIDATOR
 * 
 * Implements Section 6 of the Governance Evolution Control Request.
 * Prevents deployments that break governance guarantees.
 */
export async function validateGovernanceCompatibility(): Promise<{
  ok: boolean;
  violations: string[];
}> {
  const violations: string[] = [];
  const dbContext = await governanceEvolutionEngine.getLatestContext();

  // 1. Workflow Engine Compatibility
  const expectedWorkflowVersion = "1.0.0"; // Should be synced with code
  if (dbContext.workflow_engine_version !== expectedWorkflowVersion) {
    violations.push(
      `Workflow Engine Mismatch: Code expects ${expectedWorkflowVersion}, DB reports ${dbContext.workflow_engine_version}`
    );
  }

  // 2. RBAC Hierarchy Compatibility
  const expectedRbacVersion = "1.0.0";
  if (dbContext.rbac_hierarchy_version !== expectedRbacVersion) {
    violations.push(
      `RBAC Hierarchy Mismatch: Code expects ${expectedRbacVersion}, DB reports ${dbContext.rbac_hierarchy_version}`
    );
  }

  // 3. Certification Ruleset Compatibility (Section 5)
  if (dbContext.certification_rules_version !== igbcScoreModel.version) {
    violations.push(
      `Certification Ruleset Mismatch: Code expects ${igbcScoreModel.version}, DB reports ${dbContext.certification_rules_version}`
    );
  }

  // 4. Schema Compatibility (Section 3)
  const currentSchemaVersion = "1.0.0";
  if (dbContext.schema_version !== currentSchemaVersion) {
    violations.push(
      `Schema Version Mismatch: Code expects ${currentSchemaVersion}, DB reports ${dbContext.schema_version}`
    );
  }

  return {
    ok: violations.length === 0,
    violations,
  };
}

/**
 * Authoritative check for deployment gating.
 */
export async function enforceDeploymentGate() {
  console.log("[GOVERNANCE_GATE] Validating runtime compatibility...");
  const result = await validateGovernanceCompatibility();
  
  if (!result.ok) {
    console.error("!!! GOVERNANCE COMPATIBILITY VIOLATION !!!");
    result.violations.forEach(v => console.error(` - ${v}`));
    console.error("Deployment MUST fail to preserve governance integrity.");
    process.exit(1);
  }

  console.log("[GOVERNANCE_GATE] Compatibility verified. Proceeding with deployment.");
}
