"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseIntegrityMonitor = void 0;
class ResponseIntegrityMonitor {
    static initializeResponse(queryId) {
        this.metrics.set(queryId, {
            queryId,
            generatedLength: 0,
            deliveredLength: 0,
            streamChunks: 0,
            completed: false,
            timestamp: Date.now()
        });
    }
    static logChunk(queryId, chunkLength) {
        const metric = this.metrics.get(queryId);
        if (metric) {
            metric.generatedLength += chunkLength;
            metric.deliveredLength += chunkLength; // Assuming 1:1 delivery for now
            metric.streamChunks += 1;
        }
    }
    static markComplete(queryId, fullResponse) {
        const metric = this.metrics.get(queryId);
        if (metric) {
            metric.completed = true;
            this.validateIntegrity(metric, fullResponse);
        }
    }
    static reportFrontendRender(queryId, renderedLength) {
        const metric = this.metrics.get(queryId);
        if (metric) {
            metric.renderedLength = renderedLength;
            this.validateIntegrity(metric, null);
        }
    }
    static validateIntegrity(metric, fullResponse) {
        // Check lengths
        if (metric.generatedLength !== metric.deliveredLength) {
            console.warn(`[Integrity Warning] Length mismatch: generated=${metric.generatedLength}, delivered=${metric.deliveredLength}`);
        }
        if (metric.renderedLength !== undefined && metric.deliveredLength !== metric.renderedLength) {
            console.error(`[Integrity Error] Rendered length mismatch for ${metric.queryId}! Delivered: ${metric.deliveredLength}, Rendered: ${metric.renderedLength}`);
        }
        // Check sentence completion if the response is finished
        if (fullResponse && metric.completed) {
            this.checkSentenceCompletion(fullResponse);
        }
    }
    static checkSentenceCompletion(text) {
        const trimmed = text.trim();
        if (!trimmed)
            return;
        const lastChar = trimmed[trimmed.length - 1];
        const validEndingChars = ['.', '!', '?', '"', '\'', '`', '>'];
        // Quick heuristic for code blocks or standard sentences
        if (!validEndingChars.includes(lastChar) && !trimmed.endsWith("```")) {
            console.warn(`[Integrity Warning] Response might be truncated. Ends with: '${lastChar}'`);
        }
    }
    static getMetrics(queryId) {
        return this.metrics.get(queryId);
    }
}
exports.ResponseIntegrityMonitor = ResponseIntegrityMonitor;
ResponseIntegrityMonitor.metrics = new Map();
