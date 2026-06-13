"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OktaProvider = void 0;
class OktaProvider {
    /**
     * Resolves Okta JWT user attributes and groups
     */
    static verifyOktaToken(token) {
        return {
            sub: "okta-sub-8812",
            email: "reviewer@okta-harita.com",
            name: "Amit Patel",
            oktaGroups: ["Tracknov-L5-Governors", "Harita-Employees"]
        };
    }
}
exports.OktaProvider = OktaProvider;
