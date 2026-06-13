"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeQuotaGovernor = void 0;
class RuntimeQuotaGovernor {
    /**
     * Enforces infrastructure cost parameters gracefully without crashing active user submission channels
     */
    static checkQuota(category, requestedAmount, currentUsage) {
        let allowed = true;
        let degradeProcessing = false;
        let alertTriggered = false;
        let errorMessage = null;
        let degradationSuggestion = null;
        let activeQuotaLevel = "NORMAL";
        switch (category) {
            case "AI_TOKEN":
                const nextTokens = currentUsage.aiTokensUsed + requestedAmount;
                if (nextTokens > currentUsage.aiTokensLimit) {
                    // Hard rule: Never crash. Degrade to local heuristics/mocked presets.
                    allowed = true;
                    degradeProcessing = true;
                    alertTriggered = true;
                    activeQuotaLevel = "DEGRADED";
                    degradationSuggestion = "AI token quota exceeded. Automatically switching extraction support to local lightweight rule stubs rather than expensive LLM inferences.";
                }
                else if (nextTokens > currentUsage.aiTokensLimit * 0.85) {
                    alertTriggered = true;
                    degradationSuggestion = "AI token usage is at 85% capacity. Admin warning triggered.";
                }
                break;
            case "OCR":
                const nextOcr = currentUsage.ocrProcessedBytes + requestedAmount;
                if (nextOcr > currentUsage.ocrProcessedLimit) {
                    allowed = true;
                    degradeProcessing = true;
                    alertTriggered = true;
                    activeQuotaLevel = "DEGRADED";
                    degradationSuggestion = "OCR processing quota exceeded. Automatically switching to text-only extraction (omitting heavy geometric table coordinate extraction).";
                }
                break;
            case "UPLOAD":
                const nextUploads = currentUsage.uploadsCount + requestedAmount;
                if (nextUploads > currentUsage.uploadsLimit) {
                    // Keep letting them upload, but flag to admin
                    allowed = true;
                    alertTriggered = true;
                    activeQuotaLevel = "DEGRADED";
                    degradationSuggestion = "Upload limit exceeded. Allow submission but queue a billing upgrade reminder for admin.";
                }
                break;
            case "STORAGE":
                const nextStorage = currentUsage.storageBytesUsed + requestedAmount;
                if (nextStorage > currentUsage.storageBytesLimit) {
                    allowed = true; // Still allow files to prevent breaking review, warn admin
                    alertTriggered = true;
                    activeQuotaLevel = "DEGRADED";
                    degradationSuggestion = "Workspace storage threshold breached. Compression level automatically scaled to maximum to save hosting space.";
                }
                break;
            case "EXPORT":
                const nextExports = currentUsage.exportsCount + requestedAmount;
                if (nextExports > currentUsage.exportsLimit) {
                    allowed = true;
                    alertTriggered = true;
                    degradationSuggestion = "Export limit reached. Generate review draft rather than high-resolution audited report package.";
                }
                break;
            case "SEATS":
                if (currentUsage.reviewerSeatsUsed + requestedAmount > currentUsage.reviewerSeatsLimit) {
                    // Cannot add active reviewers, block seat allocation, but keep existing reviewers working
                    allowed = false;
                    errorMessage = "Reviewer seat allocation limit reached. Please contact sales@tracknov.com to expand your audit team slots.";
                    activeQuotaLevel = "BLOCKED";
                }
                break;
        }
        return {
            allowed,
            degradeProcessing,
            alertTriggered,
            errorMessage,
            degradationSuggestion,
            activeQuotaLevel,
        };
    }
}
exports.RuntimeQuotaGovernor = RuntimeQuotaGovernor;
