"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseAudit = void 0;
class ResponseAudit {
    static audit(question, plannerName, finalPrompt, tracer) {
        tracer.logStage(plannerName, question, finalPrompt);
    }
}
exports.ResponseAudit = ResponseAudit;
