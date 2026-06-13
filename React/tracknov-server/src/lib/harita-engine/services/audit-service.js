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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = exports.AuditService = void 0;
const server_1 = require("@/lib/supabase/server");
const admin_1 = require("@/lib/supabase/admin");
const env_1 = require("@/lib/env");
const exceljs_1 = __importDefault(require("exceljs"));
class AuditService {
    get client() { return (0, server_1.createClient)(); }
    get admin() { return env_1.env.supabaseServiceRoleKey ? (0, admin_1.createAdminClient)() : this.client; }
    getProjectAuditLogs(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data, error } = yield this.admin
                .from("activity_logs")
                .select("*")
                .eq("project_id", projectId)
                .order("created_at", { ascending: false });
            if (error)
                throw error;
            return data;
        });
    }
    getDocumentAuditLogs(documentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data, error } = yield this.admin
                .from("document_activity_logs")
                .select("*")
                .eq("document_id", documentId)
                .order("created_at", { ascending: false });
            if (error)
                throw error;
            return data;
        });
    }
    generateAuditExport(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const logs = yield this.getProjectAuditLogs(projectId);
            const workbook = new exceljs_1.default.Workbook();
            const worksheet = workbook.addWorksheet("Audit Trail");
            worksheet.columns = [
                { header: 'Timestamp', key: 'Timestamp', width: 25 },
                { header: 'Action', key: 'Action', width: 20 },
                { header: 'ActorRole', key: 'ActorRole', width: 15 },
                { header: 'Summary', key: 'Summary', width: 50 },
                { header: 'Details', key: 'Details', width: 40 }
            ];
            logs.forEach(log => {
                worksheet.addRow({
                    Timestamp: new Date(log.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                    Action: log.action,
                    ActorRole: log.actor_role,
                    Summary: log.summary,
                    Details: JSON.stringify(log.details)
                });
            });
            worksheet.getRow(1).font = { bold: true };
            const buffer = yield workbook.xlsx.writeBuffer();
            return buffer;
        });
    }
    logEvent(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { error } = yield this.admin.from("activity_logs").insert({
                project_id: params.projectId,
                document_id: params.documentId,
                action: params.action,
                actor_id: params.actorId,
                actor_role: params.actorRole,
                summary: params.summary,
                details: params.details || {}
            });
            if (error) {
                // Silently fail activity logging to not interrupt main flow
            }
        });
    }
}
exports.AuditService = AuditService;
exports.auditService = new AuditService();
