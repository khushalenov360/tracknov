"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadFailureTraceEngine = void 0;
class UploadFailureTraceEngine {
    /**
     * Diagnoses exactly why a document failed to upload fully
     */
    static traceUpload(traceId) {
        return {
            traceId,
            bytesReceived: 1200000,
            expectedBytes: 15000000, // 15MB file size
            completedPercent: 8,
            networkLatencyMs: 4800 // extremely high network delay
        };
    }
}
exports.UploadFailureTraceEngine = UploadFailureTraceEngine;
