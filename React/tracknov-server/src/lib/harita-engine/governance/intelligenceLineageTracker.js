"use strict";
/**
 * Tracknov Knowledge Governance - Intelligence Lineage Tracker
 * Mapped lineage nodes to track how adjustments propagate through versions.
 */
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntelligenceLineageTracker = void 0;
class IntelligenceLineageTracker {
    static trackAdjustment(parentVersion, semanticVersion, influencedBy, benchmarkVersion, replayHash) {
        const id = `node-${Math.random().toString(36).substr(2, 9)}`;
        const node = {
            id,
            parentNodes: [parentVersion],
            influencedBy,
            benchmarkVersion,
            semanticVersion,
            replayHash
        };
        this.lineageGraph.set(id, node);
        return node;
    }
    static getLineage(id) {
        return this.lineageGraph.get(id) || null;
    }
    static listLineageNodes() {
        return Array.from(this.lineageGraph.values());
    }
}
exports.IntelligenceLineageTracker = IntelligenceLineageTracker;
_a = IntelligenceLineageTracker;
IntelligenceLineageTracker.lineageGraph = new Map();
(() => {
    // Seed bootstrap lineage tracking node
    _a.lineageGraph.set("node-root", {
        id: "node-root",
        parentNodes: [],
        influencedBy: ["bootstrap-correction"],
        benchmarkVersion: "v1.0",
        semanticVersion: "1.0.0",
        replayHash: "HASH-BOOTSTRAP-INTEGRITY"
    });
})();
