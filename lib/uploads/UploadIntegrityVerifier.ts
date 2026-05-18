export interface PreflightValidationResult {
  valid: boolean;
  reason?: string;
  readabilityScore: number; // 0 to 1
  isScannedPdf: boolean;
  compressionRecommended: boolean;
}

export class UploadIntegrityVerifier {
  /**
   * Prevalidates a file before sending it over the network to catch corrupted/unreadable inputs early
   */
  static async verifyFile(
    fileName: string,
    fileSize: number,
    fileType: string,
    arrayBuffer?: ArrayBuffer
  ): Promise<PreflightValidationResult> {
    const isPdf = fileType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
    const isImage = fileType.startsWith("image/") || /\.(png|jpe?g|webp|tiff)$/i.test(fileName);

    if (!isPdf && !isImage) {
      return {
        valid: false,
        reason: "Unsupported extension. Tracknov requires PDF documents or raw framework imagery.",
        readabilityScore: 0,
        isScannedPdf: false,
        compressionRecommended: false,
      };
    }

    if (fileSize > 250 * 1024 * 1024) { // 250MB limit
      return {
        valid: false,
        reason: "File size exceeds the 250MB corporate ingestion threshold.",
        readabilityScore: 0,
        isScannedPdf: false,
        compressionRecommended: true,
      };
    }

    // Inspect headers if bytes are supplied
    let isScannedPdf = false;
    let readabilityScore = 0.95;
    let valid = true;
    let reason: string | undefined;

    if (arrayBuffer) {
      const bytes = new Uint8Array(arrayBuffer.slice(0, 10));
      // PDF Magic Bytes: %PDF- (0x25, 0x50, 0x44, 0x46)
      if (isPdf && (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46)) {
        valid = false;
        reason = "File header mismatch. The file extension claims to be a PDF, but the byte signature is corrupted or altered.";
        readabilityScore = 0;
      }

      // Check scanned quality characteristics
      if (fileName.toLowerCase().includes("scan") || isImage) {
        isScannedPdf = true;
        readabilityScore = 0.74; // Scan heuristic
      }
    }

    return {
      valid,
      reason,
      readabilityScore,
      isScannedPdf,
      compressionRecommended: fileSize > 25 * 1024 * 1024, // Recommend compression > 25MB
    };
  }
}
