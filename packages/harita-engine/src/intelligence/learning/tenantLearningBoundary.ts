/**
 * Tracknov Knowledge Governance - Tenant Learning Boundary
 * Implements tenant-isolated sandbox contexts to block leakage during semantic tuning.
 */

export class TenantLearningBoundary {
  /**
   * Validates if a specific learning element is completely safe for global aggregation.
   */
  public static assertIsolation(
    tenantId: string,
    targetTenantId: string,
    containsPrivateIdentities: boolean
  ): boolean {
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
