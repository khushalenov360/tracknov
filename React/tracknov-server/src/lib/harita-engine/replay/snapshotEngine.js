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
exports.generateSnapshot = generateSnapshot;
exports.loadSnapshotBoundary = loadSnapshotBoundary;
const admin_1 = require("@/lib/supabase/admin");
const hashSerializer_1 = require("./hashSerializer");
const REPLAY_CONTRACT_VERSION_V1 = "v1.0-deterministic";
/**
 * Creates immutable snapshot conforming to SNAPSHOT_SCHEMA_V1.
 * Snapshots become authoritative historical reconstruction anchors.
 */
function generateSnapshot(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        // Determine snapshot_version by counting existing snapshots for the project
        const { count, error: countError } = yield admin
            .from("certification_snapshots")
            .select("id", { count: "exact", head: true })
            .eq("project_id", payload.projectId);
        if (countError) {
            throw new Error(`Failed to query snapshot count: ${countError.message}`);
        }
        const snapshotVersion = (count || 0) + 1;
        // Build canonical lineage hash
        const lineageHash = (0, hashSerializer_1.generateLineageHash)({
            workflowLineage: payload.workflowState,
            certificationState: payload.certificationState,
            derivedState: payload.derivedState,
            dependencyGraph: payload.dependencyGraph,
            exportReferences: payload.exportReferences,
            replayContractVersion: REPLAY_CONTRACT_VERSION_V1,
        });
        // Prepare DB record insertion adhering to both existing columns and new columns
        // Note: certification_snapshot_hash is required by existing table definition.
        const { data, error } = yield admin
            .from("certification_snapshots")
            .insert({
            project_id: payload.projectId,
            framework_type: payload.frameworkType,
            snapshot_type: payload.snapshotType,
            snapshot_version: snapshotVersion,
            lineage_hash: lineageHash,
            parent_snapshot_id: payload.parentSnapshotId || null,
            workflow_state: payload.workflowState,
            certification_state: payload.certificationState,
            derived_state: payload.derivedState,
            export_references: payload.exportReferences,
            dependency_graph: payload.dependencyGraph,
            replay_contract_version: REPLAY_CONTRACT_VERSION_V1,
            immutable_lock: true,
            created_by: payload.createdBy || null,
            // Supply defaults for legacy non-nullable columns to ensure DB guard safety
            certification_snapshot_hash: lineageHash,
            evidence_snapshot: [],
            validation_snapshot: [],
            scoring_snapshot: payload.certificationState,
            workflow_snapshot: payload.workflowState,
            assignment_snapshot: [],
            override_lineage: [],
        })
            .select()
            .single();
        if (error) {
            throw new Error(`Immutable snapshot generation failed: ${error.message}`);
        }
        return data;
    });
}
/**
 * Loads replay-safe snapshot boundary for a given timestamp.
 */
function loadSnapshotBoundary(projectId, targetTimestamp) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        const { data, error } = yield admin
            .from("certification_snapshots")
            .select("*")
            .eq("project_id", projectId)
            .lte("created_at", targetTimestamp)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
        if (error && error.code !== "PGRST116") { // PGRST116 is row not found
            throw new Error(`Failed to load snapshot boundary: ${error.message}`);
        }
        return data || null;
    });
}
