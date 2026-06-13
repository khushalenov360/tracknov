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
exports.integrityService = exports.IntegrityService = void 0;
const admin_1 = require("@/lib/supabase/admin");
class IntegrityService {
    get admin() {
        return (0, admin_1.createAdminClient)();
    }
    /**
     * SECTION 6: Orphan-State Governance
     * Scans for project inconsistencies and creates reconciliation items.
     */
    scanForInconsistencies(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const findings = [];
            // 1. Check for documents without latest version
            const { data: latestGaps } = yield this.admin.rpc('find_latest_version_gaps', { p_project_id: projectId });
            if (latestGaps === null || latestGaps === void 0 ? void 0 : latestGaps.length) {
                findings.push(...latestGaps.map((g) => ({
                    issue_type: 'version_gap',
                    entity_type: 'document',
                    entity_id: g.project_credit_id,
                    details: Object.assign({ message: "No 'is_latest' document found for this mapping" }, g)
                })));
            }
            // 2. Check for missing audit logs on state transitions
            const { data: missingAudit } = yield this.admin.rpc('find_missing_audit_logs', { p_project_id: projectId });
            if (missingAudit === null || missingAudit === void 0 ? void 0 : missingAudit.length) {
                findings.push(...missingAudit.map((a) => ({
                    issue_type: 'missing_audit',
                    entity_type: a.entity_type,
                    entity_id: a.entity_id,
                    details: Object.assign({ message: "State change detected without corresponding audit log" }, a)
                })));
            }
            if (findings.length) {
                const reconciliationRows = findings.map(f => (Object.assign(Object.assign({}, f), { status: 'OPEN' })));
                yield this.admin.from('reconciliation_items').upsert(reconciliationRows, { onConflict: 'entity_id,issue_type' });
            }
            return findings;
        });
    }
    /**
     * SECTION 8: Guidebook Immutability
     * Locks the guidebook (project_credits) if execution has started.
     */
    lockGuidebookIfActive(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: activeWork } = yield this.admin
                .from('project_document')
                .select('id')
                .eq('project_id', projectId)
                .limit(1)
                .maybeSingle();
            if (activeWork) {
                // Logic to set project.is_guidebook_locked = true
                yield this.admin
                    .from('projects')
                    .update({ is_guidebook_locked: true })
                    .eq('id', projectId)
                    .eq('is_guidebook_locked', false);
            }
        });
    }
}
exports.IntegrityService = IntegrityService;
exports.integrityService = new IntegrityService();
