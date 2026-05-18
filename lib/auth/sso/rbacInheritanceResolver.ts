export class RbacInheritanceResolver {
  private static rolePrecedence = {
    L5_GOVERNOR: 3,
    L6_REVIEWER: 2,
    L7_AUDITOR: 1
  };

  /**
   * Asserts if an active profile possesses sufficient operational clearance
   */
  static hasClearance(userRole: keyof typeof RbacInheritanceResolver.rolePrecedence, requiredRole: keyof typeof RbacInheritanceResolver.rolePrecedence): boolean {
    const userRank = this.rolePrecedence[userRole] || 0;
    const requiredRank = this.rolePrecedence[requiredRole] || 0;
    return userRank >= requiredRank;
  }
}
