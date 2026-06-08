import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import JSZip from "jszip";
import ExcelJS from "exceljs";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { CreditWorkspace, ProjectWorkspace } from "@/lib/types";

const fileSafeSegment = /[^a-z0-9._-]+/gi;

function resolvedCreditStatus(credit: Pick<CreditWorkspace, "state" | "status">) {
  return String(credit.state ?? credit.status ?? "pending").toUpperCase();
}

export function sanitizePathSegment(value: string) {
  return value
    .trim()
    .replace(fileSafeSegment, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "unknown";
}

export function buildSubmissionZipEntryPath(args: {
  creditCode: string;
  docCategory: string;
  fileName: string;
}) {
  const creditFolder = sanitizePathSegment(args.creditCode);
  const categoryFolder = sanitizePathSegment(args.docCategory);
  const safeFileName = sanitizePathSegment(args.fileName.replace(/\.[^.]+$/, ""));
  const extension = args.fileName.includes(".") ? args.fileName.slice(args.fileName.lastIndexOf(".")) : ".bin";
  return `${creditFolder}/${categoryFolder}/${safeFileName}${extension}`;
}

export function isSubmissionExportReady(workspace: Pick<ProjectWorkspace, "credits">) {
  const mandatoryCredits = workspace.credits.filter((credit) => credit.is_mandatory);
  if (!mandatoryCredits.length) {
    return false;
  }
  return mandatoryCredits.every((credit) => {
    const state = resolvedCreditStatus(credit);
    return state === "APPROVED" || state === "CLOSED" || state === "COMPLETE";
  });
}

export function getApprovedSubmissionCredits(workspace: Pick<ProjectWorkspace, "credits">) {
  return workspace.credits
    .map((credit) => ({
      ...credit,
      documents: credit.documents.filter(
        (document) =>
          ((document.workflow_state ?? "").toUpperCase() === "APPROVED" ||
            String(document.status ?? "").toLowerCase() === "approved") &&
          document.is_latest !== false,
      ),
    }))
    .filter((credit) => credit.documents.length > 0);
}

export function buildTrackerWorkbook(workspace: ProjectWorkspace) {
  const workbook = new ExcelJS.Workbook();
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
      credit.documentation_summary ?? "",
      requirementMap.get("Narrative") ?? "NA",
      requirementMap.get("Tech Spec") ?? "NA",
      requirementMap.get("Certificate/Declaration") ?? "NA",
      requirementMap.get("Drawing") ?? "NA",
      requirementMap.get("Calculation & Tables") ?? "NA",
      requirementMap.get("Invoice") ?? "NA",
      requirementMap.get("Pic/Video") ?? "NA",
      Number((credit.completion_pct / 100).toFixed(2)),
      credit.remarks[0]?.body ?? "",
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

export async function buildProjectSummaryPdf(workspace: ProjectWorkspace) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawText("Tracknov Project Summary", {
    x: 48,
    y: 540,
    size: 22,
    font: bold,
    color: rgb(0.09, 0.35, 0.27),
  });
  page.drawText(`${workspace.project.name} • ${workspace.project.target_rating}`, {
    x: 48,
    y: 514,
    size: 11,
    font,
    color: rgb(0.29, 0.37, 0.34),
  });

  let y = 480;
  for (const credit of workspace.credits.slice(0, 22)) {
    page.drawText(credit.credit_code, { x: 48, y, size: 10, font: bold });
    page.drawText(credit.credit_name.slice(0, 40), { x: 130, y, size: 10, font });
    page.drawText(`${Math.round(credit.completion_pct)}%`, { x: 460, y, size: 10, font });
    page.drawText(resolvedCreditStatus(credit).toLowerCase(), { x: 540, y, size: 10, font });
    y -= 18;
  }

  return Buffer.from(await pdf.save());
}

export async function buildSubmissionZip(workspace: ProjectWorkspace) {
  const zip = new JSZip();
  const client = env.isConfigured ? createClient() : null;

  const approvedCredits = getApprovedSubmissionCredits(workspace);
  for (const credit of approvedCredits) {
    for (const document of credit.documents) {
      const stage = String((document as any).source_stage ?? "DESIGN").toUpperCase() === "CONSTRUCTION" ? "CONSTRUCTION" : "DESIGN";
      const zipEntryPath = buildSubmissionZipEntryPath({
        creditCode: credit.credit_code,
        docCategory: document.doc_category,
        fileName: document.file_name,
      });
      const stagePath = `${stage}/${zipEntryPath}`;

      if (client) {
        const { data, error } = await client.storage.from("project-documents").download(document.file_path);
        if (!error && data) {
          const bytes = Buffer.from(await data.arrayBuffer());
          zip.file(stagePath, bytes);
          continue;
        }
      }

      zip.file(stagePath, `Placeholder for ${document.file_name}`);
    }
  }

  return zip.generateAsync({ type: "nodebuffer" });
}
