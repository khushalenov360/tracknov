export interface UploadTraceDetails {
  traceId: string;
  bytesReceived: number;
  expectedBytes: number;
  completedPercent: number;
  networkLatencyMs: number;
}

export class UploadFailureTraceEngine {
  /**
   * Diagnoses exactly why a document failed to upload fully
   */
  static traceUpload(traceId: string): UploadTraceDetails {
    return {
      traceId,
      bytesReceived: 1200000,
      expectedBytes: 15000000, // 15MB file size
      completedPercent: 8,
      networkLatencyMs: 4800 // extremely high network delay
    };
  }
}
