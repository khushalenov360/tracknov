export class RateLimitGovernor {
  private static requestCounts = new Map<string, { count: number; windowStart: number }>();
  private static MAX_LIMIT = 1000; // max requests per minute

  /**
   * Evaluates if a tenant has exceeded their allocated API request quota
   */
  static isRateLimited(tenantId: string): boolean {
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
