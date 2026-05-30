import { EnovAitBoundary } from "./enovaitApiBoundary";

export interface ApiRequestEnvelope<T = unknown> {
  apiKey: string;
  tenantId: string;
  path: string;
  payload: T;
  timestamp: number;
}

export class PublicApiGateway {
  private static registeredKeys = new Map<string, string>(); // apiKey -> tenantId

  /**
   * Registers a secure token bound to a specific tenant
   */
  static registerKey(apiKey: string, tenantId: string): void {
    this.registeredKeys.set(apiKey, tenantId);
  }

  /**
   * Authorizes inbound API calls and maps them to their tenant boundaries
   */
  static validateRequest(req: ApiRequestEnvelope): boolean {
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
      EnovAitBoundary.validateIntelligenceRequest(req.path, "POST", req.payload);
    }

    return true;
  }

  private static isEnovAitToken(apiKey: string): boolean {
    // Stub: In a real system, tokens would have embedded scopes or roles.
    return apiKey.startsWith("enovait_");
  }
}
