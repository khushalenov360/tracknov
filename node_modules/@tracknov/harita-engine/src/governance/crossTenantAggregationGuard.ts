/**
 * Tracknov Knowledge Governance - Cross Tenant Aggregation Guard
 * Ensures statistical aggregations require at least 3 distinct tenants before global application.
 */

export class CrossTenantAggregationGuard {
  /**
   * Asserts whether a generalized pattern is safe to deploy globally.
   */
  public static isSafeToAggregate(
    tenantContributionsCount: number,
    totalRecords: number
  ): boolean {
    // Require at least 3 distinct tenants and 10 total records before generalizing patterns
    if (tenantContributionsCount < 3) {
      return false;
    }

    if (totalRecords < 10) {
      return false;
    }

    return true;
  }
}
