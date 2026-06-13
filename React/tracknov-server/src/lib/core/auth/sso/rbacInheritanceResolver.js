"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RbacInheritanceResolver = void 0;
class RbacInheritanceResolver {
    /**
     * Asserts if an active profile possesses sufficient operational clearance
     */
    static hasClearance(userRole, requiredRole) {
        const userRank = this.rolePrecedence[userRole] || 0;
        const requiredRank = this.rolePrecedence[requiredRole] || 0;
        return userRank >= requiredRank;
    }
}
exports.RbacInheritanceResolver = RbacInheritanceResolver;
RbacInheritanceResolver.rolePrecedence = {
    L5_GOVERNOR: 3,
    L6_REVIEWER: 2,
    L7_AUDITOR: 1
};
