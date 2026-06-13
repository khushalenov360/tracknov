"use strict";
/**
 * Tracknov Telemetry Layer - AI Provider Governance
 * Monitors usage, latency, failure metrics, and attributes token costs for LLM and embedding calls.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderGovernance = void 0;
class ProviderGovernance {
    /**
     * Tracks a semantic/AI request metrics footprint.
     */
    static trackRequest(provider, tokens, latencyMs, success) {
        const metric = {
            providerName: provider,
            totalTokens: tokens,
            latencyMs,
            success,
            timestamp: new Date().toISOString(),
        };
        this.metrics.push(metric);
    }
    /**
     * Calculates the overall cost attributed to a specific provider.
     */
    static getCostAttribution(provider) {
        const filtered = this.metrics.filter((m) => m.providerName === provider);
        const prices = this.tokenPriceMap[provider] || { prompt: 0, completion: 0 };
        // Assume 80% prompt / 20% completion token ratio for rough cost aggregation
        return filtered.reduce((totalCost, metric) => {
            const promptTokens = metric.totalTokens * 0.8;
            const completionTokens = metric.totalTokens * 0.2;
            return totalCost + (promptTokens * prices.prompt) + (completionTokens * prices.completion);
        }, 0);
    }
    /**
     * Checks if daily token budget has been exceeded.
     */
    static isQuotaExceeded(provider) {
        var _a;
        const todayStr = new Date().toISOString().split("T")[0];
        const dailyTokens = this.metrics
            .filter((m) => m.providerName === provider && m.timestamp.startsWith(todayStr))
            .reduce((sum, m) => sum + m.totalTokens, 0);
        const quota = (_a = this.dailyQuotaMap[provider]) !== null && _a !== void 0 ? _a : Infinity;
        return dailyTokens >= quota;
    }
    /**
     * Returns failure analytics and average latencies for active providers.
     */
    static getProviderAnalytics() {
        const analytics = {};
        const uniqueProviders = Array.from(new Set(this.metrics.map((m) => m.providerName)));
        for (const provider of uniqueProviders) {
            const providerMetrics = this.metrics.filter((m) => m.providerName === provider);
            const total = providerMetrics.length;
            const failed = providerMetrics.filter((m) => !m.success).length;
            const totalLatency = providerMetrics.reduce((sum, m) => sum + m.latencyMs, 0);
            analytics[provider] = {
                totalRequests: total,
                failureRate: total > 0 ? (failed / total) * 100 : 0.0,
                averageLatencyMs: total > 0 ? totalLatency / total : 0.0,
                costAttributionUsd: this.getCostAttribution(provider),
            };
        }
        return analytics;
    }
}
exports.ProviderGovernance = ProviderGovernance;
ProviderGovernance.metrics = [];
ProviderGovernance.tokenPriceMap = {
    "gemini-pro-1.5": { prompt: 0.00125 / 1000, completion: 0.00375 / 1000 },
    "gemini-flash-1.5": { prompt: 0.000075 / 1000, completion: 0.0003 / 1000 },
    "local-onnx": { prompt: 0.0, completion: 0.0 },
};
ProviderGovernance.dailyQuotaMap = {
    "gemini-pro-1.5": 500000, // 500k tokens per day
    "gemini-flash-1.5": 2000000, // 2M tokens per day
};
