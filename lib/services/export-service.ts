import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export type ExportType = 'ZIP' | 'PDF' | 'EXCEL';

export class ExportService {
  private get admin() {
    return createAdminClient();
  }

  async queueExport(params: {
    projectId: string;
    userId: string;
    exportType: ExportType;
    filters?: any;
  }) {
    // SECTION 12: Emergency Kill Switch
    const { data: exportControl } = await this.admin
      .from("system_controls")
      .select("is_enabled")
      .eq("feature_name", "exports")
      .single();

    if (exportControl && !exportControl.is_enabled) {
      throw new Error("Data exports are currently suspended by system administration. Please try again later.");
    }

    // SECTION 13: Certification Immutability Lock Guard
    const { data: project } = await this.admin
      .from("projects")
      .select("certification_state")
      .eq("id", params.projectId)
      .single();

    if (project && project.certification_state === "CERTIFIED_LOCKED") {
      throw new Error("Project is CERTIFIED_LOCKED. Final official certification artifacts are immutable and cannot be regenerated.");
    }

    const { data, error } = await this.admin
      .from("export_jobs")
      .insert({
        project_id: params.projectId,
        user_id: params.userId,
        export_type: params.exportType,
        filters: params.filters ?? {},
        status: "QUEUED",
      })
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  }

  async getExportStatus(jobId: string) {
    const { data, error } = await this.admin
      .from("export_jobs")
      .select("*")
      .eq("id", jobId)
      .single();
    
    if (error) throw error;
    return data;
  }

  async getExportDownloadUrl(jobId: string) {
    const job = await this.getExportStatus(jobId);
    if (job.status === "STALE" || job.status === "INVALID") {
      throw new Error("Export download blocked: the underlying project state has been modified or revoked since this export was generated. Please generate a fresh export.");
    }
    if (job.status !== "COMPLETED") {
      throw new Error(`Export download unavailable: current status is ${job.status}`);
    }
    return job.file_path;
  }
}

export const exportService = new ExportService();
