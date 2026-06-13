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
exports.processExportJobs = processExportJobs;
const admin_1 = require("@/lib/supabase/admin");
const exports_1 = require("@/lib/exports");
function processExportJobs() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const admin = (0, admin_1.createAdminClient)();
        // SECTION 12: Emergency Kill Switch
        const { data: exportControl } = yield admin
            .from("system_controls")
            .select("is_enabled")
            .eq("feature_name", "exports")
            .single();
        if (exportControl && !exportControl.is_enabled) {
            console.log("[ExportWorker] Exports are globally disabled. Skipping.");
            return { ok: true, skipped: true };
        }
        // Fetch queued or retrying jobs
        const { data: jobs, error } = yield admin
            .from("export_jobs")
            .select("*")
            .in("status", ["QUEUED", "RETRYING"])
            .order("created_at", { ascending: true })
            .limit(5);
        if (error) {
            console.error("[ExportWorker] Failed to fetch export jobs", error);
            return { ok: false, error };
        }
        if (!(jobs === null || jobs === void 0 ? void 0 : jobs.length))
            return { ok: true, processed: 0 };
        let processed = 0;
        for (const job of jobs) {
            try {
                // Update status to GENERATING
                yield admin.from("export_jobs").update({ status: "GENERATING" }).eq("id", job.id);
                // Fetch full project workspace for export
                const { data: workspace, error: wsError } = yield admin.rpc("get_project_workspace", { p_project_id: job.project_id });
                if (wsError || !workspace)
                    throw wsError || new Error("Workspace not found");
                let buffer;
                let extension;
                let contentType;
                switch (job.export_type) {
                    case "ZIP":
                        buffer = yield (0, exports_1.buildSubmissionZip)(workspace);
                        extension = "zip";
                        contentType = "application/zip";
                        break;
                    case "PDF":
                        buffer = yield (0, exports_1.buildProjectSummaryPdf)(workspace);
                        extension = "pdf";
                        contentType = "application/pdf";
                        break;
                    case "EXCEL":
                        const wb = (0, exports_1.buildTrackerWorkbook)(workspace);
                        const excelBuffer = yield wb.xlsx.writeBuffer();
                        buffer = Buffer.from(excelBuffer);
                        extension = "xlsx";
                        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                        break;
                    default:
                        throw new Error(`Unsupported export type: ${job.export_type}`);
                }
                const filePath = `exports/${job.project_id}/${job.id}.${extension}`;
                const { error: uploadError } = yield admin.storage.from("project-exports").upload(filePath, buffer, {
                    contentType,
                    upsert: true
                });
                if (uploadError)
                    throw uploadError;
                // Update to COMPLETED
                yield admin
                    .from("export_jobs")
                    .update({
                    status: "COMPLETED",
                    file_path: filePath,
                    completed_at: new Date().toISOString(),
                    attempts: ((_a = job.attempts) !== null && _a !== void 0 ? _a : 0) + 1
                })
                    .eq("id", job.id);
                processed++;
            }
            catch (err) {
                const attempts = ((_b = job.attempts) !== null && _b !== void 0 ? _b : 0) + 1;
                const nextStatus = attempts >= 3 ? "FAILED" : "RETRYING";
                yield admin
                    .from("export_jobs")
                    .update({
                    status: nextStatus,
                    last_error: err.message || "Unknown export error",
                    attempts
                })
                    .eq("id", job.id);
            }
        }
        return { ok: true, processed };
    });
}
