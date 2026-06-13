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
exports.exportService = exports.ExportService = void 0;
const admin_1 = require("@/lib/supabase/admin");
class ExportService {
    get admin() {
        return (0, admin_1.createAdminClient)();
    }
    queueExport(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // SECTION 12: Emergency Kill Switch
            const { data: exportControl } = yield this.admin
                .from("system_controls")
                .select("is_enabled")
                .eq("feature_name", "exports")
                .single();
            if (exportControl && !exportControl.is_enabled) {
                throw new Error("Data exports are currently suspended by system administration. Please try again later.");
            }
            // SECTION 13: Certification Immutability Lock Guard
            const { data: project } = yield this.admin
                .from("projects")
                .select("certification_state")
                .eq("id", params.projectId)
                .single();
            if (project && project.certification_state === "CERTIFIED_LOCKED") {
                throw new Error("Project is CERTIFIED_LOCKED. Final official certification artifacts are immutable and cannot be regenerated.");
            }
            const { data, error } = yield this.admin
                .from("export_jobs")
                .insert({
                project_id: params.projectId,
                user_id: params.userId,
                export_type: params.exportType,
                filters: (_a = params.filters) !== null && _a !== void 0 ? _a : {},
                status: "QUEUED",
            })
                .select("id")
                .single();
            if (error)
                throw error;
            return data.id;
        });
    }
    getExportStatus(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data, error } = yield this.admin
                .from("export_jobs")
                .select("*")
                .eq("id", jobId)
                .single();
            if (error)
                throw error;
            return data;
        });
    }
    getExportDownloadUrl(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            const job = yield this.getExportStatus(jobId);
            if (job.status === "STALE" || job.status === "INVALID") {
                throw new Error("Export download blocked: the underlying project state has been modified or revoked since this export was generated. Please generate a fresh export.");
            }
            if (job.status !== "COMPLETED") {
                throw new Error(`Export download unavailable: current status is ${job.status}`);
            }
            return job.file_path;
        });
    }
}
exports.ExportService = ExportService;
exports.exportService = new ExportService();
