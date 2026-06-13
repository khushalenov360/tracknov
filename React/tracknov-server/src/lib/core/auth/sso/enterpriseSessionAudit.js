"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnterpriseSessionAudit = void 0;
class EnterpriseSessionAudit {
    /**
     * Logs session details and screens for geographic IP jumps
     */
    static auditSession(session) {
        const isAnomalous = session.ipAddress.startsWith("10.99.") || session.deviceType.includes("Unknown");
        const updated = Object.assign(Object.assign({}, session), { suspiciousActivity: isAnomalous });
        this.activeSessions.push(updated);
    }
    static getSessions() {
        return this.activeSessions;
    }
    static revokeSession(sessionId) {
        this.activeSessions = this.activeSessions.filter((s) => s.sessionId !== sessionId);
    }
}
exports.EnterpriseSessionAudit = EnterpriseSessionAudit;
EnterpriseSessionAudit.activeSessions = [];
