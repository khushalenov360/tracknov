"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicApiGateway = void 0;
const enovaitApiBoundary_1 = require("./enovaitApiBoundary");
class PublicApiGateway {
    /**
     * Registers a secure token bound to a specific tenant
     */
    static registerKey(apiKey, tenantId) {
        this.registeredKeys.set(apiKey, tenantId);
    }
    /**
     * Authorizes inbound API calls and maps them to their tenant boundaries
     */
    static validateRequest(req) {
        const boundTenant = this.registeredKeys.get(req.apiKey);
        if (!boundTenant || boundTenant !== req.tenantId) {
            return false; // Unauthorized
        }
        // Enforce 10-second request freshness to prevent stale packet attacks
        const drift = Math.abs(Date.now() - req.timestamp);
        if (drift > 10000) {
            return false; // Replay attack suspected
        }
        // If this key is known to belong to EnovAIT (e.g. an AI agent token), enforce governance boundary
        if (this.isEnovAitToken(req.apiKey)) {
            enovaitApiBoundary_1.EnovAitBoundary.validateIntelligenceRequest(req.path, "POST", req.payload);
        }
        return true;
    }
    static isEnovAitToken(apiKey) {
        // Stub: In a real system, tokens would have embedded scopes or roles.
        return apiKey.startsWith("enovait_");
    }
}
exports.PublicApiGateway = PublicApiGateway;
PublicApiGateway.registeredKeys = new Map(); // apiKey -> tenantId
