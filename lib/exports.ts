import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { CreditWorkspace, ProjectWorkspace } from "@/lib/types";

export function isSubmissionExportReady(workspace: Pick<ProjectWorkspace, "credits">) {
  const mandatoryCredits = workspace.credits.filter((credit) => credit.is_mandatory);
  if (!mandatoryCredits.length) {
    return false;
  }
  return mandatoryCredits.every((credit) => credit.status === "complete");
}

export function getApprovedSubmissionCredits(workspace: Pick<ProjectWorkspace, "credits">) {
  return workspace.credits
    .map((credit) => ({
      ...credit,
      documents: credit.documents.filter((document) => document.status === "approved"),
    }))
    .filter((credit) => credit.documents.length > 0);
}

function trackerRows(credits: CreditWorkspace[]) {
  const rows: (string | number)[][] = [
    [],
    [
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
    ],
    [],
  ];

  let currentCategory = "";
  for (const credit of credits) {
    if (currentCategory !== credit.category) {
      currentCategory = credit.category;
      rows.push([credit.category, "", "", "", "", "", "", "", "", "", "", ""]);
    }

    const requirementMap = new Map(credit.documents_required.map((doc) => [doc.type, doc.required ? "Required" : "NA"]));
    rows.push([
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

  return rows;
}

export function buildTrackerWorkbook(workspace: ProjectWorkspace) {
  const workbook = XLSX.utils.book_new();
  const trackerSheet = XLSX.utils.aoa_to_sheet(trackerRows(workspace.credits));
  trackerSheet["!cols"] = [
    { wch: 18 },
    { wch: 34 },
    { wch: 80 },
    { wch: 14 },
    { wch: 12 },
    { wch: 22 },
    { wch: 12 },
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(workbook, trackerSheet, "Document tracker");

  const dashboardRows = [
    ["Section", "Total Credits", "Completed (%)", "In Progress", "Required", "NA"],
    ...workspace.credits.map((credit) => [
      credit.credit_code,
      1,
      Number((credit.completion_pct / 100).toFixed(2)),
      credit.status === "in_progress" ? 1 : 0,
      credit.documents_required.filter((item) => item.required).length,
      credit.documents_required.filter((item) => !item.required).length,
    ]),
  ];
  const dashboardSheet = XLSX.utils.aoa_to_sheet(dashboardRows);
  dashboardSheet["!cols"] = Array.from({ length: 6 }, () => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(workbook, dashboardSheet, "Dashboard");
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
    page.drawText(credit.status, { x: 540, y, size: 10, font });
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
      const folder = zip.folder(`${credit.credit_code}/${document.doc_category}`);
      if (!folder) {
        continue;
      }

      if (client) {
        const { data, error } = await client.storage.from("project-documents").download(document.file_path);
        if (!error && data) {
          const bytes = Buffer.from(await data.arrayBuffer());
          folder.file(document.file_name, bytes);
          continue;
        }
      }

      folder.file(document.file_name, `Placeholder for ${document.file_name}`);
    }
  }

  return zip.generateAsync({ type: "nodebuffer" });
}
