"use strict";
/**
 * Tracknov Knowledge Governance - Semantic Quarantine Engine
 * Isolates noisy or poisoned learning outputs so they do not contaminate global model layers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticQuarantineEngine = void 0;
class SemanticQuarantineEngine {
    /**
     * Quarantines a suspicious learning parameter or override sequence.
     */
    static quarantine(reason, affectedModules, contaminationRisk) {
        const id = `q-${Math.random().toString(36).substr(2, 9)}`;
        const event = {
            id,
            reason,
            affectedModules,
            contaminationRisk,
            quarantineStatus: "QUARANTINED",
            quarantinedAt: new Date().toISOString()
        };
        this.quarantines.set(id, event);
        return event;
    }
    static listQuarantined() {
        return Array.from(this.quarantines.values());
    }
    static updateStatus(id, status) {
        const target = this.quarantines.get(id);
        if (!target)
            return false;
        target.quarantineStatus = status;
        return true;
    }
    /**
     * Asserts whether a given module is safe from quarantined entries.
     */
    static isModuleContaminated(moduleName) {
        return Array.from(this.quarantines.values()).some(q => q.quarantineStatus === "QUARANTINED" && q.affectedModules.includes(moduleName) && q.contaminationRisk > 0.8);
    }
}
exports.SemanticQuarantineEngine = SemanticQuarantineEngine;
SemanticQuarantineEngine.quarantines = new Map();
