"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadIntegrityVerifier = void 0;
class UploadIntegrityVerifier {
    /**
     * Prevalidates a file before sending it over the network to catch corrupted/unreadable inputs early
     */
    static verifyFile(fileName, fileSize, fileType, arrayBuffer) {
        return __awaiter(this, void 0, void 0, function* () {
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
            let reason;
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
        });
    }
}
exports.UploadIntegrityVerifier = UploadIntegrityVerifier;
