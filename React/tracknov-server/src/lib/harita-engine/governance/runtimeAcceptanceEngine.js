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
exports.evaluateRuntimeAcceptance = evaluateRuntimeAcceptance;
const admin_1 = require("@/lib/supabase/admin");
const runtimeReplayHarness_1 = require("../replay/runtimeReplayHarness");
/**
 * Authoritative Runtime Acceptance Engine.
 * Decision-maker for production readiness based on actual runtime-generated proofs.
 * "No runtime proof = deployment blocked."
 */
function evaluateRuntimeAcceptance(projectId, targetTimestamp, expectedHash) {
    return __awaiter(this, void 0, void 0, function* () {
        const failedChecks = [];
        const admin = (0, admin_1.createAdminClient)();
        // 1. Execute full governed replay cycle
        const harnessResult = yield (0, runtimeReplayHarness_1.executeGovernedReplayHarness)(projectId, targetTimestamp, expectedHash);
        if (harnessResult.error) {
            failedChecks.push(`REPLAY_EXECUTION_ERROR: ${harnessResult.error}`);
        }
        // 2. Validate Determinism
        if (!harnessResult.deterministicMatch) {
            failedChecks.push("DETERMINISM_MISMATCH: Recomputed hash does not match authoritative lineage.");
        }
        // 3. Validate Purity & Isolation (via evidence in DB)
        if (!harnessResult.purityValidated) {
            failedChecks.push("PURITY_VIOLATION: Side-effects detected during replay.");
        }
        // 4. Verify Replay Certificate Existence
        if (!harnessResult.replayCertificateId) {
            failedChecks.push("MISSING_CERTIFICATE: No valid replay certificate generated.");
        }
        // 5. Cross-check Proof Artifacts in DB
        const { data: artifacts, error: artifactsError } = yield admin
            .from("runtime_proof_artifacts")
            .select("proof_type")
            .eq("project_id", projectId)
            .gte("generated_at", new Date(Date.now() - 5 * 60000).toISOString()); // Last 5 mins
        const proofTypes = (artifacts === null || artifacts === void 0 ? void 0 : artifacts.map(a => a.proof_type)) || [];
        if (!proofTypes.includes("DETERMINISM_VERIFICATION")) {
            failedChecks.push("MISSING_DETERMINISM_PROOF: No actual evidence artifact found in ledger.");
        }
        const result = {
            accepted: failedChecks.length === 0,
            failedChecks,
            deterministicReplayPassed: harnessResult.deterministicMatch,
            purityPassed: harnessResult.purityValidated,
            isolationPassed: harnessResult.isolationValidated,
            replayCertificateValidated: !!harnessResult.replayCertificateId,
            runtimeHashValidated: harnessResult.deterministicMatch,
            generatedAt: new Date().toISOString()
        };
        // Deployment blocking logic (Simulated here, but would be called by CI/CD)
        if (!result.accepted) {
            console.error(`[RUNTIME_ACCEPTANCE_FAILED] Project: ${projectId}. Deployment blocked.`, failedChecks);
        }
        else {
            console.log(`[RUNTIME_ACCEPTANCE_PASSED] Project: ${projectId}. Deployment authorized.`);
        }
        return result;
    });
}
