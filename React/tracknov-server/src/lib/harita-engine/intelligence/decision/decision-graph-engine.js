"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionGraphEngine = void 0;
class DecisionGraphEngine {
    constructor() {
        this.credits = new Map();
        this.evidence = new Map();
        this.tasks = new Map();
    }
    addCredit(credit) {
        this.credits.set(credit.id, credit);
    }
    addEvidence(evidence) {
        this.evidence.set(evidence.id, evidence);
    }
    addTask(task) {
        this.tasks.set(task.id, task);
    }
    /**
     * Calculates the full graph impact for all nodes.
     * Does not depend on uploaded documents.
     */
    evaluateGraph() {
        const nodes = [];
        // Evaluate credits
        for (const credit of this.credits.values()) {
            // Impact is its own points + impact of credits it blocks
            let impact = credit.certificationImpact;
            impact += this.calculateBlockingImpact(credit.id, new Set());
            nodes.push({
                entityId: credit.id,
                type: 'credit',
                impact: impact,
                dependencies: credit.dependsOn,
                owners: credit.owners
            });
        }
        // Evaluate evidence
        for (const ev of this.evidence.values()) {
            const parentCredit = this.credits.get(ev.satisfies);
            const impact = parentCredit ? (parentCredit.certificationImpact * 0.8) : 0; // arbitrary heuristic for evidence
            nodes.push({
                entityId: ev.id,
                type: 'evidence',
                impact: impact,
                dependencies: [ev.satisfies],
                owners: ev.owners
            });
        }
        // Evaluate tasks
        for (const task of this.tasks.values()) {
            const parentCredit = this.credits.get(task.advances);
            const impact = parentCredit ? (parentCredit.certificationImpact * 0.5) : 0; // arbitrary heuristic for task
            nodes.push({
                entityId: task.id,
                type: 'task',
                impact: impact,
                dependencies: [task.advances],
                owners: task.owners
            });
        }
        return nodes.sort((a, b) => b.impact - a.impact);
    }
    calculateBlockingImpact(creditId, visited) {
        if (visited.has(creditId))
            return 0;
        visited.add(creditId);
        const credit = this.credits.get(creditId);
        if (!credit || !credit.blocks || credit.blocks.length === 0)
            return 0;
        let blockedImpact = 0;
        for (const blockedId of credit.blocks) {
            const blockedCredit = this.credits.get(blockedId);
            if (blockedCredit) {
                blockedImpact += blockedCredit.certificationImpact;
                blockedImpact += this.calculateBlockingImpact(blockedId, visited);
            }
        }
        return blockedImpact;
    }
    getHighestImpactNode(type) {
        const nodes = this.evaluateGraph();
        if (type) {
            return nodes.find(n => n.type === type) || null;
        }
        return nodes[0] || null;
    }
}
exports.DecisionGraphEngine = DecisionGraphEngine;
