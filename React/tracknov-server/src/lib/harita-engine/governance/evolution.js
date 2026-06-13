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
exports.governanceEvolutionEngine = exports.GovernanceEvolutionEngine = void 0;
const admin_1 = require("@/lib/supabase/admin");
/**
 * GOVERNANCE EVOLUTION CONTROL ENGINE
 *
 * Implements Section 1 and 2 of the Governance Evolution Control Request.
 * Ensures that historical state remains deterministic across platform upgrades.
 */
class GovernanceEvolutionEngine {
    constructor() {
        this.currentContext = null;
    }
    static getInstance() {
        if (!GovernanceEvolutionEngine.instance) {
            GovernanceEvolutionEngine.instance = new GovernanceEvolutionEngine();
        }
        return GovernanceEvolutionEngine.instance;
    }
    /**
     * Fetches the authoritative governance version context from the database.
     */
    getLatestContext() {
        return __awaiter(this, void 0, void 0, function* () {
            // If we have it cached and it's fresh enough, return it.
            // In production, we might want a TTL or an event-driven refresh.
            if (this.currentContext)
                return this.currentContext;
            const admin = (0, admin_1.createAdminClient)();
            const { data: versions, error } = yield admin
                .from("governance_versions")
                .select("component_name, current_version");
            if (error || !versions) {
                console.error("[GOVERNANCE_EVOLUTION_ERROR] Failed to fetch versions:", error);
                // Fallback to baseline versions if DB is unavailable
                return this.getBaselineContext();
            }
            const context = {};
            versions.forEach(v => {
                const key = `${v.component_name.toLowerCase()}_version`;
                context[key] = v.current_version;
            });
            // Hardcoded schema version for now, should ideally come from migration registry
            context.schema_version = "1.0.0";
            this.currentContext = context;
            return this.currentContext;
        });
    }
    getBaselineContext() {
        return {
            workflow_engine_version: "1.0.0",
            rbac_hierarchy_version: "1.0.0",
            validation_engine_version: "1.0.0",
            replay_contract_version: "1.0.0",
            certification_rules_version: "1.0.0",
            schema_version: "1.0.0"
        };
    }
    /**
     * Records a version change in the governance log.
     */
    logVersionChange(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const admin = (0, admin_1.createAdminClient)();
            const { error } = yield admin.from("governance_change_log").insert({
                component_name: params.componentName,
                old_version: params.oldVersion,
                new_version: params.newVersion,
                change_reason: params.reason,
                actor_id: params.actorId,
                impact_analysis: params.impactAnalysis || {}
            });
            if (error) {
                console.error("[GOVERNANCE_EVOLUTION_ERROR] Failed to log version change:", error);
            }
            // Invalidate cache
            this.currentContext = null;
        });
    }
    /**
     * Maps a historical snapshot to the current schema/rules if needed.
     * Section 3: Schema Migration Compatibility Engine
     */
    mapSnapshot(snapshot, historicalVersion) {
        return __awaiter(this, void 0, void 0, function* () {
            const current = yield this.getLatestContext();
            // If versions match, no mapping needed
            if (JSON.stringify(current) === JSON.stringify(historicalVersion)) {
                return snapshot;
            }
            console.log(`[GOVERNANCE_COMPATIBILITY] Mapping snapshot from ${historicalVersion.schema_version} to ${current.schema_version}`);
            // Implement specific migration mappers here
            // Example: if (historicalVersion.schema_version === '0.9.0' && current.schema_version === '1.0.0') { ... }
            return snapshot;
        });
    }
}
exports.GovernanceEvolutionEngine = GovernanceEvolutionEngine;
exports.governanceEvolutionEngine = GovernanceEvolutionEngine.getInstance();
