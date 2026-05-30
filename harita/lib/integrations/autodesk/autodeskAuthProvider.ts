export interface AutodeskTokenSession {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  scope: string[];
  tenantId: string;
}

export class AutodeskAuthProvider {
  private static tokenStore = new Map<string, AutodeskTokenSession>();

  /**
   * Fetches or updates a tenant-scoped Autodesk OAuth session
   */
  static async getTenantSession(tenantId: string): Promise<AutodeskTokenSession> {
    const existing = this.tokenStore.get(tenantId);
    if (existing && Date.now() < (existing.expiresIn - 60000)) {
      return existing;
    }

    // Simulate OAuth2 flow with secure mock provider
    const newSession: AutodeskTokenSession = {
      accessToken: `mock_adsk_access_token_${tenantId}_${Math.random().toString(36).substr(2, 9)}`,
      expiresIn: Date.now() + 3600000, // 1 hour
      refreshToken: `mock_adsk_refresh_token_${tenantId}`,
      scope: ["data:read", "bucket:read"],
      tenantId
    };

    this.tokenStore.set(tenantId, newSession);
    return newSession;
  }

  /**
   * Instantly revokes session tokens to block unauthorized access
   */
  static revokeSession(tenantId: string): boolean {
    return this.tokenStore.delete(tenantId);
  }
}
