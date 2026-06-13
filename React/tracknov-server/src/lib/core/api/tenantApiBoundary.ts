export class TenantApiBoundary {
  /**
   * Asserts that all data queried or mutated matches the caller's tenantId context
   */
  static assertTenantAccess(targetTenantId: string, authorizedTenantId: string): void {
    if (targetTenantId !== authorizedTenantId) {
      throw new Error(`[SECURITY ALERT] Cross-tenant API access block! authorized=${authorizedTenantId}, requested=${targetTenantId}`);
    }
  }
}
