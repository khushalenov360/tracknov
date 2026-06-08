export interface BehavioralSession {
  sessionId: string;
  tenantId: string;
  pageViews: string[];
  totalTimeSpentMs: number;
  fatigueScore: number; // calculated based on speed of clicks
}

export class CustomerBehaviorProfiler {
  private static sessions = new Map<string, BehavioralSession>();

  /**
   * Tracks and stores visitor workflow habits to highlight onboard abandonment
   */
  static logActivity(sessionId: string, tenantId: string, page: string, durationMs: number): void {
    const existing = this.sessions.get(sessionId) || {
      sessionId,
      tenantId,
      pageViews: [],
      totalTimeSpentMs: 0,
      fatigueScore: 0
    };

    existing.pageViews.push(page);
    existing.totalTimeSpentMs += durationMs;

    // Calculate fatigue: rapid sequential clicks indicate frustration
    if (existing.pageViews.length > 8 && durationMs < 500) {
      existing.fatigueScore = Math.min(100, existing.fatigueScore + 15);
    }

    this.sessions.set(sessionId, existing);
  }

  static getSession(sessionId: string): BehavioralSession | undefined {
    return this.sessions.get(sessionId);
  }
}
