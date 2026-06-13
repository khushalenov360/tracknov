"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitGovernor = void 0;
class RateLimitGovernor {
    /**
     * Evaluates if a tenant has exceeded their allocated API request quota
     */
    static isRateLimited(tenantId) {
        const now = Date.now();
        const data = this.requestCounts.get(tenantId) || { count: 0, windowStart: now };
        if (now - data.windowStart > 60000) {
            // reset window
            data.count = 1;
            data.windowStart = now;
            this.requestCounts.set(tenantId, data);
            return false;
        }
        data.count++;
        this.requestCounts.set(tenantId, data);
        return data.count > this.MAX_LIMIT;
    }
}
exports.RateLimitGovernor = RateLimitGovernor;
RateLimitGovernor.requestCounts = new Map();
RateLimitGovernor.MAX_LIMIT = 1000; // max requests per minute
