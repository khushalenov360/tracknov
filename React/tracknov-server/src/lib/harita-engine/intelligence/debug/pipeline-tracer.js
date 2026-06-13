"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineTracer = void 0;
class PipelineTracer {
    constructor() {
        this.traces = [];
        this.startTime = Date.now();
    }
    logStage(stage, question, output) {
        const duration = Date.now() - this.startTime;
        const trace = {
            stage,
            timestamp: new Date().toISOString(),
            question,
            output,
            durationMs: duration
        };
        this.traces.push(trace);
        this.startTime = Date.now(); // Reset for next stage
        if (process.env.HARITA_DEBUG === 'true') {
            console.log(`\n[HARITA_TRACE]`);
            console.log(`Stage:\n${stage}`);
            console.log(`Output:\n${output}`);
            console.log(`Duration:\n${duration}ms`);
        }
    }
    getTraces() {
        return this.traces;
    }
}
exports.PipelineTracer = PipelineTracer;
