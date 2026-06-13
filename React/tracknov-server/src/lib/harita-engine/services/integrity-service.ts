import { createAdminClient } from "@/lib/supabase/admin";

export class IntegrityService {
  private get admin() {
    return createAdminClient();
  }

  /**
   * SECTION 6: Orphan-State Governance
   * Scans for project inconsistencies and creates reconciliation items.
   */
  async scanForInconsistencies(projectId: string) {
    const findings: any[] = [];

    // 1. Check for documents without latest version
    const { data: latestGaps } = await this.admin.rpc('find_latest_version_gaps', { p_project_id: projectId });
    if (latestGaps?.length) {
      findings.push(...latestGaps.map((g: any) => ({
        issue_type: 'version_gap',
        entity_type: 'document',
        entity_id: g.project_credit_id,
        details: { message: "No 'is_latest' document found for this mapping", ...g }
      })));
    }

    // 2. Check for missing audit logs on state transitions
    const { data: missingAudit } = await this.admin.rpc('find_missing_audit_logs', { p_project_id: projectId });
    if (missingAudit?.length) {
      findings.push(...missingAudit.map((a: any) => ({
        issue_type: 'missing_audit',
        entity_type: a.entity_type,
        entity_id: a.entity_id,
        details: { message: "State change detected without corresponding audit log", ...a }
      })));
    }

    if (findings.length) {
      const reconciliationRows = findings.map(f => ({
        ...f,
        status: 'OPEN'
      }));
      await this.admin.from('reconciliation_items').upsert(reconciliationRows, { onConflict: 'entity_id,issue_type' });
    }

    return findings;
  }

  /**
   * SECTION 8: Guidebook Immutability
   * Locks the guidebook (project_credits) if execution has started.
   */
  async lockGuidebookIfActive(projectId: string) {
    const { data: activeWork } = await this.admin
      .from('project_document')
      .select('id')
      .eq('project_id', projectId)
      .limit(1)
      .maybeSingle();
    
    if (activeWork) {
      // Logic to set project.is_guidebook_locked = true
      await this.admin
        .from('projects')
        .update({ is_guidebook_locked: true })
        .eq('id', projectId)
        .eq('is_guidebook_locked', false);
    }
  }
}

export const integrityService = new IntegrityService();
