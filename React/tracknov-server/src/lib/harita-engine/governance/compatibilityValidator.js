"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGovernanceCompatibility = validateGovernanceCompatibility;
exports.enforceDeploymentGate = enforceDeploymentGate;
const evolution_1 = require("./evolution");
const igbc_scoring_1 = require("@/lib/igbc-scoring");
/**
 * RUNTIME COMPATIBILITY VALIDATOR
 *
 * Implements Section 6 of the Governance Evolution Control Request.
 * Prevents deployments that break governance guarantees.
 */
function validateGovernanceCompatibility() {
    return __awaiter(this, void 0, void 0, function* () {
        const violations = [];
        const dbContext = yield evolution_1.governanceEvolutionEngine.getLatestContext();
        // 1. Workflow Engine Compatibility
        const expectedWorkflowVersion = "1.0.0"; // Should be synced with code
        if (dbContext.workflow_engine_version !== expectedWorkflowVersion) {
            violations.push(`Workflow Engine Mismatch: Code expects ${expectedWorkflowVersion}, DB reports ${dbContext.workflow_engine_version}`);
        }
        // 2. RBAC Hierarchy Compatibility
        const expectedRbacVersion = "1.0.0";
        if (dbContext.rbac_hierarchy_version !== expectedRbacVersion) {
            violations.push(`RBAC Hierarchy Mismatch: Code expects ${expectedRbacVersion}, DB reports ${dbContext.rbac_hierarchy_version}`);
        }
        // 3. Certification Ruleset Compatibility (Section 5)
        if (dbContext.certification_rules_version !== igbc_scoring_1.igbcScoreModel.version) {
            violations.push(`Certification Ruleset Mismatch: Code expects ${igbc_scoring_1.igbcScoreModel.version}, DB reports ${dbContext.certification_rules_version}`);
        }
        // 4. Schema Compatibility (Section 3)
        const currentSchemaVersion = "1.0.0";
        if (dbContext.schema_version !== currentSchemaVersion) {
            violations.push(`Schema Version Mismatch: Code expects ${currentSchemaVersion}, DB reports ${dbContext.schema_version}`);
        }
        return {
            ok: violations.length === 0,
            violations,
        };
    });
}
/**
 * Authoritative check for deployment gating.
 */
function enforceDeploymentGate() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("[GOVERNANCE_GATE] Validating runtime compatibility...");
        const result = yield validateGovernanceCompatibility();
        if (!result.ok) {
            console.error("!!! GOVERNANCE COMPATIBILITY VIOLATION !!!");
            result.violations.forEach(v => console.error(` - ${v}`));
            console.error("Deployment MUST fail to preserve governance integrity.");
            process.exit(1);
        }
        console.log("[GOVERNANCE_GATE] Compatibility verified. Proceeding with deployment.");
    });
}
