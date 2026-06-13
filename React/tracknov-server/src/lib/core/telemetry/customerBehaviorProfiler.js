"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerBehaviorProfiler = void 0;
class CustomerBehaviorProfiler {
    /**
     * Tracks and stores visitor workflow habits to highlight onboard abandonment
     */
    static logActivity(sessionId, tenantId, page, durationMs) {
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
    static getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
}
exports.CustomerBehaviorProfiler = CustomerBehaviorProfiler;
CustomerBehaviorProfiler.sessions = new Map();
