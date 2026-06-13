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
exports.validateLongDurationReplay = validateLongDurationReplay;
const admin_1 = require("@/lib/supabase/admin");
const governanceIncidentEngine_1 = require("../governance/governanceIncidentEngine");
/**
 * LONG DURATION REPLAY VALIDATOR
 *
 * Ensures that historical snapshots remain valid and reproducible throughout the soak test.
 */
function validateLongDurationReplay(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        // 1. Fetch random historical snapshot
        const { data: snapshots } = yield admin
            .from("certification_snapshots")
            .select("id, certification_snapshot_hash, created_at")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
            .limit(10);
        if (!snapshots || snapshots.length === 0)
            return true;
        // Pick one to re-verify
        const target = snapshots[Math.floor(Math.random() * snapshots.length)];
        // 2. Cross-reference with Replay Certificates
        const { data: certificate } = yield admin
            .from("replay_certificates")
            .select("replay_hash, deterministic_match")
            .eq("snapshot_id", target.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
        if (certificate && certificate.replay_hash !== target.certification_snapshot_hash) {
            yield (0, governanceIncidentEngine_1.reportGovernanceIncident)({
                type: "replay_hash_mismatch",
                severity: "critical",
                projectId,
                replayContext: {
                    snapshotId: target.id,
                    storedHash: target.certification_snapshot_hash,
                    certificateHash: certificate.replay_hash,
                    detectedAt: new Date().toISOString()
                }
            });
            return false;
        }
        // 3. Verify Deterministic Pass Count
        const { count: passCount } = yield admin
            .from("replay_certificates")
            .select("*", { count: 'exact', head: true })
            .eq("snapshot_id", target.id)
            .eq("deterministic_match", true);
        if (passCount && passCount < 3) {
            // We expect at least 3 consecutive passes for long-duration stability
            console.log(`[SOAK] Warning: Snapshot ${target.id} only has ${passCount} passes.`);
        }
        return true;
    });
}
