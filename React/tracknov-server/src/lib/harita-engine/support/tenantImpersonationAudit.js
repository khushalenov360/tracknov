"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantImpersonationAudit = void 0;
class TenantImpersonationAudit {
    /**
     * Logs a secure support access impersonation event
     */
    static logImpersonation(supportUserId, targetTenantId, justificationNote) {
        const record = {
            auditId: `IMP-AUDIT-${Math.floor(Math.random() * 90000 + 10000)}`,
            supportUserId,
            targetTenantId,
            justificationNote,
            timestamp: new Date().toISOString()
        };
        this.auditLogs.push(record);
        return record;
    }
    static getLogs() {
        return this.auditLogs;
    }
}
exports.TenantImpersonationAudit = TenantImpersonationAudit;
TenantImpersonationAudit.auditLogs = [];
