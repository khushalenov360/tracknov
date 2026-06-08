export interface ImpersonationAuditLog {
  auditId: string;
  supportUserId: string;
  targetTenantId: string;
  justificationNote: string;
  timestamp: string;
}

export class TenantImpersonationAudit {
  private static auditLogs: ImpersonationAuditLog[] = [];

  /**
   * Logs a secure support access impersonation event
   */
  static logImpersonation(
    supportUserId: string,
    targetTenantId: string,
    justificationNote: string
  ): ImpersonationAuditLog {
    const record: ImpersonationAuditLog = {
      auditId: `IMP-AUDIT-${Math.floor(Math.random() * 90000 + 10000)}`,
      supportUserId,
      targetTenantId,
      justificationNote,
      timestamp: new Date().toISOString()
    };

    this.auditLogs.push(record);
    return record;
  }

  static getLogs(): ImpersonationAuditLog[] {
    return this.auditLogs;
  }
}
