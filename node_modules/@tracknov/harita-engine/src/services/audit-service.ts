import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import ExcelJS from "exceljs";

export class AuditService {
  private get client() { return createClient(); }
  private get admin() { return env.supabaseServiceRoleKey ? createAdminClient() : this.client; }

  async getProjectAuditLogs(projectId: string) {
    const { data, error } = await this.admin
      .from("activity_logs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  async getDocumentAuditLogs(documentId: string) {
    const { data, error } = await this.admin
      .from("document_activity_logs")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  async generateAuditExport(projectId: string) {
    const logs = await this.getProjectAuditLogs(projectId);
    
    const workbook = new ExcelJS.Workbook();
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

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async logEvent(params: {
    projectId: string;
    documentId?: string;
    action: string;
    actorId: string;
    actorRole: string;
    summary: string;
    details?: any;
  }) {
    const { error } = await this.admin.from("activity_logs").insert({
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
  }
}

export const auditService = new AuditService();
