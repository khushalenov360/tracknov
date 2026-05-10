import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getProjectWorkspace } from "@/lib/data";
import { computeIgbcScore } from "./igbc-scoring-service";
import ExcelJS from "exceljs";

export class ClientService {
  private get client() { return createClient(); }
  private get admin() { return env.supabaseServiceRoleKey ? createAdminClient() : this.client; }

  async generateClientStatusReport(projectId: string) {
    const workspace = await getProjectWorkspace(projectId);
    if (!workspace) throw new Error("Project not found.");

    const score = computeIgbcScore(workspace);
    const credits = workspace.credits ?? [];

    const workbook = new ExcelJS.Workbook();
    
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
      statusSheet.addRow({
        "Credit Code": credit.credit_code,
        "Credit Name": credit.credit_name,
        "Status": credit.status,
        "Mandatory": credit.is_mandatory ? "Yes" : "No",
        "Completion %": credit.completion_pct ?? 0,
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

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async getClientAlerts(projectId: string) {
    const workspace = await getProjectWorkspace(projectId);
    if (!workspace) return [];

    const score = computeIgbcScore(workspace);
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
  }
}

export const clientService = new ClientService();
