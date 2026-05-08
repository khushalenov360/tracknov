import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import * as XLSX from "xlsx";

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
    
    const worksheetData = logs.map(log => ({
      Timestamp: new Date(log.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      Action: log.action,
      ActorRole: log.actor_role,
      Summary: log.summary,
      Details: JSON.stringify(log.details)
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Trail");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
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
    if (error) console.error("[AuditService] Failed to log activity:", error);
  }
}

export const auditService = new AuditService();
