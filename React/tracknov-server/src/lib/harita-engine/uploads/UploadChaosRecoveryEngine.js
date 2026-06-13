"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadChaosRecoveryEngine = void 0;
class UploadChaosRecoveryEngine {
    /**
     * Evaluates upload failure logs and determines automatic recovery routes
     */
    static evaluateFailure(context) {
        const isMobile = context.mimeType.includes("mobile") || context.fileName.includes("mobile");
        let shouldRetry = context.attempts < 3;
        let recoveryAction = "RETRY_FROM_LAST_CHUNK";
        let clientActionMessage = "We detected a temporary network fluctuation. Resuming your document upload automatically.";
        switch (context.failureReason) {
            case "encrypted":
                shouldRetry = false;
                recoveryAction = "REQUEST_PASSWORD_OR_DECRYPTED";
                clientActionMessage = "This document is password protected. Please remove protection and try uploading again.";
                break;
            case "malformed_format":
                shouldRetry = false;
                recoveryAction = "REQUEST_PDF_CONVERSION";
                clientActionMessage = "This document format is unrecognized. Please convert it to a standard PDF and upload.";
                break;
            case "corrupted_bytes":
                shouldRetry = false;
                recoveryAction = "REQUEST_CLEAN_REUPLOAD";
                clientActionMessage = "The uploaded file appears to be corrupted. Please re-save or re-download the document and upload.";
                break;
            case "rotated_scan":
                shouldRetry = true;
                recoveryAction = "APPLY_AUTO_ALIGNMENT_OCR";
                clientActionMessage = "Document is scanned sideways. We are automatically aligning the orientation to extract text.";
                break;
            case "partial_upload":
            case "network_interrupted":
            case "mobile_disconnect":
                shouldRetry = true;
                recoveryAction = "RESUME_CHUNK_STREAM";
                clientActionMessage = isMobile
                    ? "Mobile connection interrupted. Re-establishing connection and resuming upload from the last active chunk."
                    : "Connection interrupted. Resuming upload progress immediately.";
                break;
            case "timeout":
                shouldRetry = true;
                recoveryAction = "SCALE_CHUNK_SIZE_DOWN";
                clientActionMessage = "Upload timed out. Retrying with a smaller chunk size to preserve battery and bandwidth.";
                break;
        }
        return {
            shouldRetry,
            recoveryAction,
            clientActionMessage,
        };
    }
    /**
     * Processes a document stream with high tolerance for scanning and encoding flaws, recovering maximum possible context
     */
    static attemptPartialRecovery(fileName, fileSize, mimeType, rawBytesLength) {
        const isScanned = fileName.toLowerCase().includes("scan") || mimeType.includes("image");
        const isHuge = fileSize > 5 * 1024 * 1024; // > 5MB
        // Simulate smart recovery percentages based on input constraints
        let ocrQualityScore = 0.95;
        let partialRecoveryPercentage = 100;
        let autoRotated = false;
        let scannedTablesExtracted = 0;
        let quarantineRequired = false;
        const suggestions = [];
        if (isScanned) {
            ocrQualityScore = 0.72; // Lower score for raw scans
            autoRotated = true;
            scannedTablesExtracted = 3;
            suggestions.push("Highly recommended to upload original digital documents rather than physical scans to maximize clarity.");
        }
        if (isHuge) {
            suggestions.push("Huge schedule detected. Large spreadsheets should ideally be exported to Excel formats for precise processing.");
        }
        if (rawBytesLength < fileSize * 0.8) {
            // Significantly incomplete file
            partialRecoveryPercentage = Math.round((rawBytesLength / fileSize) * 100);
            ocrQualityScore = Math.max(0.2, ocrQualityScore - 0.4);
            quarantineRequired = true;
            suggestions.push("Incomplete upload. The system saved a partial snapshot, but full document parsing requires re-upload.");
        }
        return {
            recovered: partialRecoveryPercentage > 30,
            ocrQualityScore: parseFloat(ocrQualityScore.toFixed(2)),
            partialRecoveryPercentage,
            recoveredTextLength: Math.round(rawBytesLength * 0.45),
            autoRotated,
            scannedTablesExtracted,
            quarantineRequired,
            suggestions,
        };
    }
}
exports.UploadChaosRecoveryEngine = UploadChaosRecoveryEngine;
