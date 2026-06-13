"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiAuditLogger = void 0;
class ApiAuditLogger {
    /**
     * Appends a secure log record documenting an inbound API request
     */
    static logRequest(tenantId, path, statusCode) {
        this.auditLogs.push({
            requestId: `REQ-${Math.floor(Math.random() * 900000 + 100000)}`,
            tenantId,
            apiKeyHash: "sha256_hash_value",
            path,
            statusCode,
            timestamp: new Date().toISOString()
        });
    }
    static getLogs(tenantId) {
        return this.auditLogs.filter((l) => l.tenantId === tenantId);
    }
}
exports.ApiAuditLogger = ApiAuditLogger;
ApiAuditLogger.auditLogs = [];
