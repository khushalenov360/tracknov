export interface UploadFailureTrace {
  traceId: string;
  fileName: string;
  fileSizeMb: number;
  reason: "NETWORK_TIMEOUT" | "SIZE_LIMIT" | "OCR_CORRUPTION" | "TYPE_MISMATCH";
  recommendsCompression: boolean;
}

export class UploadFailureProfiler {
  /**
   * Evaluates document upload contexts to suggest recovery strategies
   */
  static profileFailure(
    fileName: string,
    fileSizeMb: number,
    errorMsg: string
  ): UploadFailureTrace {
    let reason: UploadFailureTrace["reason"] = "OCR_CORRUPTION";
    let recommendsCompression = false;

    const msg = errorMsg.toLowerCase();
    if (msg.includes("timeout") || msg.includes("network") || msg.includes("slow")) {
      reason = "NETWORK_TIMEOUT";
    } else if (fileSizeMb > 25 || msg.includes("large") || msg.includes("size")) {
      reason = "SIZE_LIMIT";
      recommendsCompression = true;
    } else if (msg.includes("format") || msg.includes("extension") || msg.includes("type")) {
      reason = "TYPE_MISMATCH";
    }

    return {
      traceId: `ERR-TRACE-${Math.floor(Math.random() * 90000 + 10000)}`,
      fileName,
      fileSizeMb,
      reason,
      recommendsCompression
    };
  }
}
