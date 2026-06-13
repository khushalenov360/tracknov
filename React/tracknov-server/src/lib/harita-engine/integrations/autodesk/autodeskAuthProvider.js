"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutodeskAuthProvider = void 0;
class AutodeskAuthProvider {
    /**
     * Fetches or updates a tenant-scoped Autodesk OAuth session
     */
    static getTenantSession(tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const existing = this.tokenStore.get(tenantId);
            if (existing && Date.now() < (existing.expiresIn - 60000)) {
                return existing;
            }
            // Simulate OAuth2 flow with secure mock provider
            const newSession = {
                accessToken: `mock_adsk_access_token_${tenantId}_${Math.random().toString(36).substr(2, 9)}`,
                expiresIn: Date.now() + 3600000, // 1 hour
                refreshToken: `mock_adsk_refresh_token_${tenantId}`,
                scope: ["data:read", "bucket:read"],
                tenantId
            };
            this.tokenStore.set(tenantId, newSession);
            return newSession;
        });
    }
    /**
     * Instantly revokes session tokens to block unauthorized access
     */
    static revokeSession(tenantId) {
        return this.tokenStore.delete(tenantId);
    }
}
exports.AutodeskAuthProvider = AutodeskAuthProvider;
AutodeskAuthProvider.tokenStore = new Map();
