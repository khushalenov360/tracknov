"use strict";
/**
 * Tracknov Knowledge Governance - Tenant Learning Boundary
 * Implements tenant-isolated sandbox contexts to block leakage during semantic tuning.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantLearningBoundary = void 0;
class TenantLearningBoundary {
    /**
     * Validates if a specific learning element is completely safe for global aggregation.
     */
    static assertIsolation(tenantId, targetTenantId, containsPrivateIdentities) {
        // Strict enforcement: Direct cross-tenant learning triggers a hard block
        if (tenantId !== targetTenantId) {
            return false;
        }
        // Block any elements holding private metadata
        if (containsPrivateIdentities) {
            return false;
        }
        return true;
    }
}
exports.TenantLearningBoundary = TenantLearningBoundary;
