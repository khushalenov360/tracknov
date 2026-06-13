"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleWorkspaceProvider = void 0;
class GoogleWorkspaceProvider {
    /**
     * Asserts hosted domain context for enterprise security
     */
    static verifyGoogleDomain(profile, allowedDomain) {
        return profile.verifiedEmail && profile.hdDomain === allowedDomain;
    }
}
exports.GoogleWorkspaceProvider = GoogleWorkspaceProvider;
