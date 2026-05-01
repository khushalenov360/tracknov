import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getProjectWorkspace } from "@/lib/data";
import { computeIgbcScore } from "./igbc-scoring-service";
import * as XLSX from "xlsx";

export class ClientService {
  private get client() { return createClient(); }
  private get admin() { return env.supabaseServiceRoleKey ? createAdminClient() : this.client; }

  async generateClientStatusReport(projectId: string) {
    const workspace = await getProjectWorkspace(projectId);
    if (!workspace) throw new Error("Project not found.");

    const score = computeIgbcScore(workspace);
    const credits = workspace.credits ?? [];

    const worksheetData = credits.map(credit => ({
      "Credit Code": credit.credit_code,
      "Credit Name": credit.credit_name,
      "Status": credit.status,
      "Mandatory": credit.is_mandatory ? "Yes" : "No",
      "Completion %": credit.completion_pct ?? 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Project Status");

    // Add Summary sheet
    const summaryData = [
      { Metric: "Project Name", Value: workspace.project.name },
      { Metric: "Overall Completion", Value: `${score.overall.scorePct}%` },
      { Metric: "Projected Rating", Value: score.overall.projectedRating },
      { Metric: "Mandatory Credits Approved", Value: `${score.mandatory.approved} / ${score.mandatory.total}` },
      { Metric: "Report Generated At", Value: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) }
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Executive Summary");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
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
