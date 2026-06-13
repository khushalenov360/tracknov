"use strict";
/**
 * Tracknov Knowledge Governance - AI Reasoning Version Trace
 * Documents the migration path of reasoning models as new benchmarks certify.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiReasoningVersionTrace = void 0;
class AiReasoningVersionTrace {
    /**
     * Explains difference in reasoning rules between two semantic release states.
     */
    static traceReasoningShift(fromVersion, toVersion, baseRule) {
        return `AI Reasoning Shift (${fromVersion} &rarr; ${toVersion}): Base rule "${baseRule}" has been calibrated prospective-only under active governor sign-off. Normalization weights updated.`;
    }
}
exports.AiReasoningVersionTrace = AiReasoningVersionTrace;
