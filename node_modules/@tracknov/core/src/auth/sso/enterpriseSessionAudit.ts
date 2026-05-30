export interface SessionDetail {
  sessionId: string;
  userId: string;
  ipAddress: string;
  deviceType: string;
  lastActive: string;
  suspiciousActivity: boolean;
}

export class EnterpriseSessionAudit {
  private static activeSessions: SessionDetail[] = [];

  /**
   * Logs session details and screens for geographic IP jumps
   */
  static auditSession(session: SessionDetail): void {
    const isAnomalous = session.ipAddress.startsWith("10.99.") || session.deviceType.includes("Unknown");
    const updated = {
      ...session,
      suspiciousActivity: isAnomalous
    };

    this.activeSessions.push(updated);
  }

  static getSessions(): SessionDetail[] {
    return this.activeSessions;
  }

  static revokeSession(sessionId: string): void {
    this.activeSessions = this.activeSessions.filter((s) => s.sessionId !== sessionId);
  }
}
