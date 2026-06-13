"use strict";
/**
 * Tracknov Knowledge Governance - Benchmark Evolution History
 * Tracks accuracy milestones over release transitions.
 */
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BenchmarkEvolutionHistory = void 0;
class BenchmarkEvolutionHistory {
    static addMilestone(version, accuracy) {
        this.milestones.push({
            benchmarkVersion: version,
            accuracyScore: accuracy * 100,
            failureRate: (1.0 - accuracy) * 100,
            timestamp: new Date().toISOString()
        });
    }
    static getHistory() {
        return this.milestones;
    }
}
exports.BenchmarkEvolutionHistory = BenchmarkEvolutionHistory;
_a = BenchmarkEvolutionHistory;
BenchmarkEvolutionHistory.milestones = [];
(() => {
    _a.milestones.push({
        benchmarkVersion: "v1.0",
        accuracyScore: 94.2,
        failureRate: 5.8,
        timestamp: new Date().toISOString()
    });
})();
