"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationIdentityBoundary = void 0;
class OrganizationIdentityBoundary {
    /**
     * Prevents credential usage outside defined corporate domain boundaries
     */
    static validateBoundary(email, allowedDomains) {
        const parts = email.split("@");
        if (parts.length < 2)
            return false;
        const domain = parts[1].toLowerCase();
        return allowedDomains.map((d) => d.toLowerCase()).includes(domain);
    }
}
exports.OrganizationIdentityBoundary = OrganizationIdentityBoundary;
