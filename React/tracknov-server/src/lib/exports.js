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
exports.sanitizePathSegment = sanitizePathSegment;
exports.buildSubmissionZipEntryPath = buildSubmissionZipEntryPath;
exports.isSubmissionExportReady = isSubmissionExportReady;
exports.getApprovedSubmissionCredits = getApprovedSubmissionCredits;
exports.buildTrackerWorkbook = buildTrackerWorkbook;
exports.buildProjectSummaryPdf = buildProjectSummaryPdf;
exports.buildSubmissionZip = buildSubmissionZip;
const pdf_lib_1 = require("pdf-lib");
const jszip_1 = __importDefault(require("jszip"));
const exceljs_1 = __importDefault(require("exceljs"));
const env_1 = require("@/lib/env");
const server_1 = require("@/lib/supabase/server");
const fileSafeSegment = /[^a-z0-9._-]+/gi;
function resolvedCreditStatus(credit) {
    var _a, _b;
    return String((_b = (_a = credit.state) !== null && _a !== void 0 ? _a : credit.status) !== null && _b !== void 0 ? _b : "pending").toUpperCase();
}
function sanitizePathSegment(value) {
    return value
        .trim()
        .replace(fileSafeSegment, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80) || "unknown";
}
function buildSubmissionZipEntryPath(args) {
    const creditFolder = sanitizePathSegment(args.creditCode);
    const categoryFolder = sanitizePathSegment(args.docCategory);
    const safeFileName = sanitizePathSegment(args.fileName.replace(/\.[^.]+$/, ""));
    const extension = args.fileName.includes(".") ? args.fileName.slice(args.fileName.lastIndexOf(".")) : ".bin";
    return `${creditFolder}/${categoryFolder}/${safeFileName}${extension}`;
}
function isSubmissionExportReady(workspace) {
    const mandatoryCredits = workspace.credits.filter((credit) => credit.is_mandatory);
    if (!mandatoryCredits.length) {
        return false;
    }
    return mandatoryCredits.every((credit) => {
        const state = resolvedCreditStatus(credit);
        return state === "APPROVED" || state === "CLOSED" || state === "COMPLETE";
    });
}
function getApprovedSubmissionCredits(workspace) {
    return workspace.credits
        .map((credit) => (Object.assign(Object.assign({}, credit), { documents: credit.documents.filter((document) => {
            var _a, _b;
            return (((_a = document.workflow_state) !== null && _a !== void 0 ? _a : "").toUpperCase() === "APPROVED" ||
                String((_b = document.status) !== null && _b !== void 0 ? _b : "").toLowerCase() === "approved") &&
                document.is_latest !== false;
        }) })))
        .filter((credit) => credit.documents.length > 0);
}
function buildTrackerWorkbook(workspace) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const workbook = new exceljs_1.default.Workbook();
    const trackerSheet = workbook.addWorksheet("Document tracker");
    // Headers
    trackerSheet.addRow([]); // Row 1: Empty
    const headerRow = trackerSheet.addRow([
        "Criteria",
        "Credit ",
        "Remarks /Documents Required",
        "Narrative",
        "Tech Specs",
        "Certificates/ Declaration",
        "Drawings",
        "Calculations & Tables",
        "Invoices",
        "Pic/Video",
        "% Completion",
        "Remark",
    ]);
    headerRow.font = { bold: true };
    trackerSheet.addRow([]); // Row 3: Empty
    let currentCategory = "";
    for (const credit of workspace.credits) {
        if (currentCategory !== credit.category) {
            currentCategory = credit.category;
            const catRow = trackerSheet.addRow([credit.category, "", "", "", "", "", "", "", "", "", "", ""]);
            catRow.font = { bold: true };
            catRow.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFF0F0F0" },
            };
        }
        const requirementMap = new Map(credit.documents_required.map((doc) => [doc.type, doc.required ? "Required" : "NA"]));
        trackerSheet.addRow([
            credit.credit_code.replace(" C", " Credit ").replace(" MR", " Mandatory Requirement "),
            credit.credit_name,
            (_a = credit.documentation_summary) !== null && _a !== void 0 ? _a : "",
            (_b = requirementMap.get("Narrative")) !== null && _b !== void 0 ? _b : "NA",
            (_c = requirementMap.get("Tech Spec")) !== null && _c !== void 0 ? _c : "NA",
            (_d = requirementMap.get("Certificate/Declaration")) !== null && _d !== void 0 ? _d : "NA",
            (_e = requirementMap.get("Drawing")) !== null && _e !== void 0 ? _e : "NA",
            (_f = requirementMap.get("Calculation & Tables")) !== null && _f !== void 0 ? _f : "NA",
            (_g = requirementMap.get("Invoice")) !== null && _g !== void 0 ? _g : "NA",
            (_h = requirementMap.get("Pic/Video")) !== null && _h !== void 0 ? _h : "NA",
            Number((credit.completion_pct / 100).toFixed(2)),
            (_k = (_j = credit.remarks[0]) === null || _j === void 0 ? void 0 : _j.body) !== null && _k !== void 0 ? _k : "",
        ]);
    }
    trackerSheet.columns = [
        { width: 18 },
        { width: 34 },
        { width: 80 },
        { width: 14 },
        { width: 12 },
        { width: 22 },
        { width: 12 },
        { width: 22 },
        { width: 12 },
        { width: 12 },
        { width: 14 },
        { width: 30 },
    ];
    const dashboardSheet = workbook.addWorksheet("Dashboard");
    const dashHeader = dashboardSheet.addRow(["Section", "Total Credits", "Completed (%)", "In Progress", "Required", "NA"]);
    dashHeader.font = { bold: true };
    for (const credit of workspace.credits) {
        dashboardSheet.addRow([
            credit.credit_code,
            1,
            Number((credit.completion_pct / 100).toFixed(2)),
            resolvedCreditStatus(credit) === "IN_PROGRESS" ? 1 : 0,
            credit.documents_required.filter((item) => item.required).length,
            credit.documents_required.filter((item) => !item.required).length,
        ]);
    }
    dashboardSheet.columns = Array.from({ length: 6 }, () => ({ width: 18 }));
    return workbook;
}
function buildProjectSummaryPdf(workspace) {
    return __awaiter(this, void 0, void 0, function* () {
        const pdf = yield pdf_lib_1.PDFDocument.create();
        const page = pdf.addPage([842, 595]);
        const font = yield pdf.embedFont(pdf_lib_1.StandardFonts.Helvetica);
        const bold = yield pdf.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
        page.drawText("Tracknov Project Summary", {
            x: 48,
            y: 540,
            size: 22,
            font: bold,
            color: (0, pdf_lib_1.rgb)(0.09, 0.35, 0.27),
        });
        page.drawText(`${workspace.project.name} • ${workspace.project.target_rating}`, {
            x: 48,
            y: 514,
            size: 11,
            font,
            color: (0, pdf_lib_1.rgb)(0.29, 0.37, 0.34),
        });
        let y = 480;
        for (const credit of workspace.credits.slice(0, 22)) {
            page.drawText(credit.credit_code, { x: 48, y, size: 10, font: bold });
            page.drawText(credit.credit_name.slice(0, 40), { x: 130, y, size: 10, font });
            page.drawText(`${Math.round(credit.completion_pct)}%`, { x: 460, y, size: 10, font });
            page.drawText(resolvedCreditStatus(credit).toLowerCase(), { x: 540, y, size: 10, font });
            y -= 18;
        }
        return Buffer.from(yield pdf.save());
    });
}
function buildSubmissionZip(workspace) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const zip = new jszip_1.default();
        const client = env_1.env.isConfigured ? (0, server_1.createClient)() : null;
        const approvedCredits = getApprovedSubmissionCredits(workspace);
        for (const credit of approvedCredits) {
            for (const document of credit.documents) {
                const stage = String((_a = document.source_stage) !== null && _a !== void 0 ? _a : "DESIGN").toUpperCase() === "CONSTRUCTION" ? "CONSTRUCTION" : "DESIGN";
                const zipEntryPath = buildSubmissionZipEntryPath({
                    creditCode: credit.credit_code,
                    docCategory: document.doc_category,
                    fileName: document.file_name,
                });
                const stagePath = `${stage}/${zipEntryPath}`;
                if (client) {
                    const { data, error } = yield client.storage.from("project-documents").download(document.file_path);
                    if (!error && data) {
                        const bytes = Buffer.from(yield data.arrayBuffer());
                        zip.file(stagePath, bytes);
                        continue;
                    }
                }
                zip.file(stagePath, `Placeholder for ${document.file_name}`);
            }
        }
        return zip.generateAsync({ type: "nodebuffer" });
    });
}
