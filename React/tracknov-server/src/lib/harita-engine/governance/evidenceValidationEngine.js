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
exports.validateEvidence = validateEvidence;
const admin_1 = require("@/lib/supabase/admin");
const governanceContext_1 = require("./governanceContext");
const governanceObservabilityBus_1 = require("./governanceObservabilityBus");
/**
 * Authoritative evidence validation engine.
 * Enforces framework-specific mandatory evidence rules and completeness checks.
 */
function validateEvidence(projectId, evidenceId) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = governanceContext_1.governanceLocalStorage.getStore();
        const frameworkVersion = (context === null || context === void 0 ? void 0 : context.frameworkVersion) || "GI_V1"; // Default to V1 if not specified
        const admin = (0, admin_1.createAdminClient)();
        const errors = [];
        const warnings = [];
        const checks = ["TENANT_ISOLATION", "FRAMEWORK_ALIGNMENT", "DUPLICATE_DETECTION", "STALE_CHECK"];
        // 1. Fetch Evidence and related Credit
        const { data: evidence, error: evError } = yield admin
            .from("project_document")
            .select("*, project_credits(*)")
            .eq("id", evidenceId)
            .single();
        if (evError || !evidence) {
            throw new Error(`Evidence not found: ${evidenceId}`);
        }
        // 2. Tenant Isolation Check
        if (evidence.project_id !== projectId) {
            yield (0, governanceObservabilityBus_1.emitGovernanceEvent)({
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
        }
        else {
            // GI V1 specific rules
            if (!evidence.file_name) {
                errors.push("GI_V1 requirement: File name is mandatory.");
            }
        }
        // 4. Duplicate Detection (Simplified for this orchestrator)
        if (evidence.file_hash) {
            const { count } = yield admin
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
    });
}
