import { createAdminClient } from "@/lib/supabase/admin";

export interface GovernanceVersionContext {
  workflow_engine_version: string;
  rbac_hierarchy_version: string;
  validation_engine_version: string;
  replay_contract_version: string;
  certification_rules_version: string;
  schema_version: string;
}

/**
 * GOVERNANCE EVOLUTION CONTROL ENGINE
 * 
 * Implements Section 1 and 2 of the Governance Evolution Control Request.
 * Ensures that historical state remains deterministic across platform upgrades.
 */
export class GovernanceEvolutionEngine {
  private static instance: GovernanceEvolutionEngine;
  private currentContext: GovernanceVersionContext | null = null;

  private constructor() {}

  static getInstance(): GovernanceEvolutionEngine {
    if (!GovernanceEvolutionEngine.instance) {
      GovernanceEvolutionEngine.instance = new GovernanceEvolutionEngine();
    }
    return GovernanceEvolutionEngine.instance;
  }

  /**
   * Fetches the authoritative governance version context from the database.
   */
  async getLatestContext(): Promise<GovernanceVersionContext> {
    // If we have it cached and it's fresh enough, return it.
    // In production, we might want a TTL or an event-driven refresh.
    if (this.currentContext) return this.currentContext;

    const admin = createAdminClient();
    const { data: versions, error } = await admin
      .from("governance_versions")
      .select("component_name, current_version");

    if (error || !versions) {
      console.error("[GOVERNANCE_EVOLUTION_ERROR] Failed to fetch versions:", error);
      // Fallback to baseline versions if DB is unavailable
      return this.getBaselineContext();
    }

    const context: any = {};
    versions.forEach(v => {
      const key = `${v.component_name.toLowerCase()}_version`;
      context[key] = v.current_version;
    });

    // Hardcoded schema version for now, should ideally come from migration registry
    context.schema_version = "1.0.0";

    this.currentContext = context as GovernanceVersionContext;
    return this.currentContext;
  }

  private getBaselineContext(): GovernanceVersionContext {
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
  async logVersionChange(params: {
    componentName: string;
    oldVersion: string;
    newVersion: string;
    reason: string;
    actorId?: string;
    impactAnalysis?: any;
  }) {
    const admin = createAdminClient();
    const { error } = await admin.from("governance_change_log").insert({
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
  }

  /**
   * Maps a historical snapshot to the current schema/rules if needed.
   * Section 3: Schema Migration Compatibility Engine
   */
  async mapSnapshot(snapshot: any, historicalVersion: GovernanceVersionContext): Promise<any> {
    const current = await this.getLatestContext();
    
    // If versions match, no mapping needed
    if (JSON.stringify(current) === JSON.stringify(historicalVersion)) {
      return snapshot;
    }

    console.log(`[GOVERNANCE_COMPATIBILITY] Mapping snapshot from ${historicalVersion.schema_version} to ${current.schema_version}`);
    
    // Implement specific migration mappers here
    // Example: if (historicalVersion.schema_version === '0.9.0' && current.schema_version === '1.0.0') { ... }

    return snapshot;
  }
}

export const governanceEvolutionEngine = GovernanceEvolutionEngine.getInstance();
