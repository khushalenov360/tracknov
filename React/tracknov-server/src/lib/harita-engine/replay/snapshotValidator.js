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
exports.verifySnapshotIntegrity = verifySnapshotIntegrity;
const admin_1 = require("@/lib/supabase/admin");
const hashSerializer_1 = require("./hashSerializer");
/**
 * Recomputes and validates lineage hashes for snapshots to guarantee immutability and verify audit proof.
 */
function verifySnapshotIntegrity(snapshotId) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        const { data, error } = yield admin
            .from("certification_snapshots")
            .select("*")
            .eq("id", snapshotId)
            .single();
        if (error || !data) {
            throw new Error(`Failed to load snapshot for integrity validation: ${(error === null || error === void 0 ? void 0 : error.message) || "Not found"}`);
        }
        // Recompute the lineage hash based on retrieved snapshot data
        const recomputedHash = (0, hashSerializer_1.generateLineageHash)({
            workflowLineage: data.workflow_state || data.workflow_snapshot,
            certificationState: data.certification_state || data.scoring_snapshot,
            derivedState: data.derived_state || {},
            dependencyGraph: data.dependency_graph || {},
            exportReferences: data.export_references || {},
            replayContractVersion: data.replay_contract_version || "v1.0-deterministic",
        });
        const actualHash = data.lineage_hash || data.certification_snapshot_hash;
        const isValid = recomputedHash === actualHash;
        return {
            actualHash,
            expectedHash: recomputedHash,
            isValid,
            snapshotData: data,
        };
    });
}
