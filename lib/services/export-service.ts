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
}

export const exportService = new ExportService();
