/**
 * Tracknov Document Intelligence - Corrupted Document Detector
 * Evaluates binary file structures, signatures, and EOF markers to prevent parsing errors.
 */

export interface CorruptionCheckResult {
  isCorrupted: boolean;
  fileFormat: string;
  errorDetail?: string;
}

export class CorruptedDocumentDetector {
  /**
   * Evaluates file signature and size parameters to ensure safety.
   */
  public static verifyFile(
    fileName: string,
    buffer: Buffer
  ): CorruptionCheckResult {
    if (!buffer || buffer.length === 0) {
      return {
        isCorrupted: true,
        fileFormat: "UNKNOWN",
        errorDetail: "File buffer is empty or size is 0 bytes.",
      };
    }

    const lowerName = fileName.toLowerCase();
    
    // Check PDF Magic Header %PDF- (hex: 25 50 44 46)
    if (lowerName.endsWith(".pdf")) {
      const isPdfHeader = 
        buffer[0] === 0x25 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x44 &&
        buffer[3] === 0x46;

      if (!isPdfHeader) {
        return {
          isCorrupted: true,
          fileFormat: "PDF",
          errorDetail: "Missing valid standard %PDF magic header signature.",
        };
      }

      // Check for proper PDF EOF marker (%%EOF) in the last 1024 bytes
      const footerSegment = buffer.slice(Math.max(0, buffer.length - 1024)).toString("ascii");
      if (!footerSegment.includes("%%EOF")) {
        return {
          isCorrupted: true,
          fileFormat: "PDF",
          errorDetail: "Corrupted PDF EOF trailer. Missing standard %%EOF boundary.",
        };
      }
    }

    // Check DOCX magic header PK.. (hex: 50 4B 03 04)
    if (lowerName.endsWith(".docx")) {
      const isDocxHeader =
        buffer[0] === 0x50 &&
        buffer[1] === 0x4B &&
        buffer[2] === 0x03 &&
        buffer[3] === 0x04;

      if (!isDocxHeader) {
        return {
          isCorrupted: true,
          fileFormat: "DOCX",
          errorDetail: "Missing valid ZIP/DOCX PK archive magic header signature.",
        };
      }
    }

    return {
      isCorrupted: false,
      fileFormat: lowerName.split(".").pop()?.toUpperCase() || "UNKNOWN",
    };
  }
}
