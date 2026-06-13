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
exports.clientService = exports.ClientService = void 0;
const server_1 = require("@/lib/supabase/server");
const admin_1 = require("@/lib/supabase/admin");
const env_1 = require("@/lib/env");
const data_1 = require("@/lib/data");
const igbc_scoring_service_1 = require("./igbc-scoring-service");
const exceljs_1 = __importDefault(require("exceljs"));
class ClientService {
    get client() { return (0, server_1.createClient)(); }
    get admin() { return env_1.env.supabaseServiceRoleKey ? (0, admin_1.createAdminClient)() : this.client; }
    generateClientStatusReport(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const workspace = yield (0, data_1.getProjectWorkspace)(projectId);
            if (!workspace)
                throw new Error("Project not found.");
            const score = (0, igbc_scoring_service_1.computeIgbcScore)(workspace);
            const credits = (_a = workspace.credits) !== null && _a !== void 0 ? _a : [];
            const workbook = new exceljs_1.default.Workbook();
            // Status Sheet
            const statusSheet = workbook.addWorksheet("Project Status");
            statusSheet.columns = [
                { header: 'Credit Code', key: 'Credit Code', width: 15 },
                { header: 'Credit Name', key: 'Credit Name', width: 40 },
                { header: 'Status', key: 'Status', width: 20 },
                { header: 'Mandatory', key: 'Mandatory', width: 12 },
                { header: 'Completion %', key: 'Completion %', width: 15 }
            ];
            credits.forEach(credit => {
                var _a;
                statusSheet.addRow({
                    "Credit Code": credit.credit_code,
                    "Credit Name": credit.credit_name,
                    "Status": credit.status,
                    "Mandatory": credit.is_mandatory ? "Yes" : "No",
                    "Completion %": (_a = credit.completion_pct) !== null && _a !== void 0 ? _a : 0,
                });
            });
            statusSheet.getRow(1).font = { bold: true };
            // Summary Sheet
            const summarySheet = workbook.addWorksheet("Executive Summary");
            summarySheet.columns = [
                { header: 'Metric', key: 'Metric', width: 30 },
                { header: 'Value', key: 'Value', width: 40 }
            ];
            summarySheet.addRows([
                { Metric: "Project Name", Value: workspace.project.name },
                { Metric: "Overall Completion", Value: `${score.overall.scorePct}%` },
                { Metric: "Projected Rating", Value: score.overall.projectedRating },
                { Metric: "Mandatory Credits Approved", Value: `${score.mandatory.approved} / ${score.mandatory.total}` },
                { Metric: "Report Generated At", Value: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) }
            ]);
            summarySheet.getRow(1).font = { bold: true };
            const buffer = yield workbook.xlsx.writeBuffer();
            return buffer;
        });
    }
    getClientAlerts(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const workspace = yield (0, data_1.getProjectWorkspace)(projectId);
            if (!workspace)
                return [];
            const score = (0, igbc_scoring_service_1.computeIgbcScore)(workspace);
            const alerts = [];
            if (!score.mandatory.complete) {
                alerts.push({
                    type: "risk",
                    title: "Mandatory Credits Missing",
                    message: `${score.mandatory.total - score.mandatory.approved} mandatory credits are still pending approval.`
                });
            }
            if (score.overall.scorePct < 30) {
                alerts.push({
                    type: "warning",
                    title: "Low Progress",
                    message: "Overall project completion is below 30%."
                });
            }
            return alerts;
        });
    }
}
exports.ClientService = ClientService;
exports.clientService = new ClientService();
