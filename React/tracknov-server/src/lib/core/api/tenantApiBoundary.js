"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantApiBoundary = void 0;
class TenantApiBoundary {
    /**
     * Asserts that all data queried or mutated matches the caller's tenantId context
     */
    static assertTenantAccess(targetTenantId, authorizedTenantId) {
        if (targetTenantId !== authorizedTenantId) {
            throw new Error(`[SECURITY ALERT] Cross-tenant API access block! authorized=${authorizedTenantId}, requested=${targetTenantId}`);
        }
    }
}
exports.TenantApiBoundary = TenantApiBoundary;
