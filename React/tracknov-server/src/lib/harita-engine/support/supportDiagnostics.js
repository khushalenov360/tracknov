"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportDiagnostics = void 0;
class SupportDiagnostics {
    /**
     * Evaluates active system telemetry markers to identify why a customer is experiencing friction
     */
    static runSelfDiagnostics(context) {
        const diagnostics = [];
        const baseTrace = "TR-DIAG-" + Math.floor(Math.random() * 1000000);
        // 1. Ingestion Failures Check
        if (context.uploadFailureCount > 0) {
            diagnostics.push({
                code: "D-101",
                category: "upload",
                status: context.uploadFailureCount > 3 ? "CRITICAL" : "WARNING",
                message: `Ingestion queue registered ${context.uploadFailureCount} interrupted or corrupt submittals in the last 24h.`,
                traceId: `${baseTrace}-UP`,
                remedyAction: "Pre-compress standard PDFs or use a wired internet connection to avoid chunk degradation."
            });
        }
        else {
            diagnostics.push({
                code: "D-101",
                category: "upload",
                status: "OK",
                message: "Ingestion queues are clean. No corrupt submittals detected.",
                traceId: `${baseTrace}-UP`,
                remedyAction: "No action required."
            });
        }
        // 2. Clarification Delay Check
        if (context.clarificationAgeHours > 72) {
            diagnostics.push({
                code: "D-102",
                category: "clarification",
                status: "CRITICAL",
                message: `Auditor clarification request is pending review for ${context.clarificationAgeHours} hours, exceeding SLA targets.`,
                traceId: `${baseTrace}-CL`,
                remedyAction: "Please edit outstanding submittals to address requirements directly and ping support."
            });
        }
        // 3. Quota Limits Check
        if (context.quotaUsedPercentage >= 90) {
            diagnostics.push({
                code: "D-103",
                category: "quota",
                status: context.quotaUsedPercentage >= 100 ? "CRITICAL" : "WARNING",
                message: `Ingestion token capacity is at ${context.quotaUsedPercentage}% of corporate contract allocation.`,
                traceId: `${baseTrace}-QT`,
                remedyAction: "Upgrade corporate tier package or contact account managers to allocate emergency tokens."
            });
        }
        // 4. Export Failures Check
        if (!context.lastExportSuccess) {
            diagnostics.push({
                code: "D-104",
                category: "export",
                status: "CRITICAL",
                message: "Export generation failed due to unverified offline framework snapshots.",
                traceId: `${baseTrace}-EX`,
                remedyAction: "Execute an offline verification sync on the export page before compiling assets."
            });
        }
        return diagnostics;
    }
}
exports.SupportDiagnostics = SupportDiagnostics;
