"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphCache = void 0;
class GraphCache {
    static get(projectId) {
        const entry = this.cache.get(projectId);
        if (!entry)
            return null;
        if (Date.now() - entry.timestamp > this.TTL) {
            this.cache.delete(projectId);
            return null;
        }
        return entry.graph;
    }
    static set(projectId, graph, version = 1) {
        this.cache.set(projectId, { graph, timestamp: Date.now(), version });
    }
    static invalidate(projectId) {
        this.cache.delete(projectId);
    }
    static clear() {
        this.cache.clear();
    }
}
exports.GraphCache = GraphCache;
GraphCache.cache = new Map();
GraphCache.TTL = 5 * 60 * 1000; // 5 minutes
