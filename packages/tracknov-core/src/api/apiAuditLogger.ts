export interface ApiAuditRecord {
  requestId: string;
  tenantId: string;
  apiKeyHash: string;
  path: string;
  statusCode: number;
  timestamp: string;
}

export class ApiAuditLogger {
  private static auditLogs: ApiAuditRecord[] = [];

  /**
   * Appends a secure log record documenting an inbound API request
   */
  static logRequest(tenantId: string, path: string, statusCode: number): void {
    this.auditLogs.push({
      requestId: `REQ-${Math.floor(Math.random() * 900000 + 100000)}`,
      tenantId,
      apiKeyHash: "sha256_hash_value",
      path,
      statusCode,
      timestamp: new Date().toISOString()
    });
  }

  static getLogs(tenantId: string): ApiAuditRecord[] {
    return this.auditLogs.filter((l) => l.tenantId === tenantId);
  }
}
