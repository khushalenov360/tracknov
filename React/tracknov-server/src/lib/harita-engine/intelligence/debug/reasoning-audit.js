"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReasoningAudit = void 0;
class ReasoningAudit {
    static audit(question, reasonerName, output, tracer) {
        if (reasonerName === "BlockerReasoner" && output.evidence) {
            const blockers = output.evidence.split("\n").filter((line) => line.trim().startsWith("-")).length;
            tracer.logStage(reasonerName, question, `${blockers} blockers identified`);
        }
        else {
            tracer.logStage(reasonerName, question, "Reasoning complete");
        }
    }
}
exports.ReasoningAudit = ReasoningAudit;
