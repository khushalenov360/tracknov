"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseDeliveryMonitor = void 0;
class ResponseDeliveryMonitor {
    static initialize(queryId) {
        this.metrics.set(queryId, {
            generatedLength: 0,
            apiLength: 0,
            renderedLength: 0
        });
    }
    static logGenerated(queryId, length) {
        const metric = this.metrics.get(queryId);
        if (metric)
            metric.generatedLength += length;
    }
    static logApiDelivered(queryId, length) {
        const metric = this.metrics.get(queryId);
        if (metric)
            metric.apiLength += length;
    }
    static logRendered(queryId, length) {
        const metric = this.metrics.get(queryId);
        if (metric) {
            metric.renderedLength = length;
            this.validate(queryId);
        }
    }
    static validate(queryId) {
        const metric = this.metrics.get(queryId);
        if (!metric)
            return;
        if (metric.generatedLength !== metric.renderedLength) {
            throw new Error(`[Response Delivery Certification Failed] Truncation detected! Generated: ${metric.generatedLength}, Rendered: ${metric.renderedLength}`);
        }
    }
    static validateSentenceCompletion(text) {
        const trimmed = text.trim();
        if (!trimmed)
            return;
        const lastChar = trimmed[trimmed.length - 1];
        const validEndingChars = ['.', '!', '?', '"', '\'', '`', '>'];
        if (!validEndingChars.includes(lastChar) && !trimmed.endsWith("```")) {
            throw new Error(`[Response Delivery Certification Failed] Mid-sentence termination detected! Ends with: '${lastChar}'`);
        }
    }
}
exports.ResponseDeliveryMonitor = ResponseDeliveryMonitor;
ResponseDeliveryMonitor.metrics = new Map();
