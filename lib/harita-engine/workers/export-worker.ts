import { createAdminClient } from "@/lib/supabase/admin";
import { buildSubmissionZip, buildProjectSummaryPdf, buildTrackerWorkbook } from "@/lib/exports";

export async function processExportJobs() {
  const admin = createAdminClient();

  // SECTION 12: Emergency Kill Switch
  const { data: exportControl } = await admin
    .from("system_controls")
    .select("is_enabled")
    .eq("feature_name", "exports")
    .single();

  if (exportControl && !exportControl.is_enabled) {
    console.log("[ExportWorker] Exports are globally disabled. Skipping.");
    return { ok: true, skipped: true };
  }

  // Fetch queued or retrying jobs
  const { data: jobs, error } = await admin
    .from("export_jobs")
    .select("*")
    .in("status", ["QUEUED", "RETRYING"])
    .order("created_at", { ascending: true })
    .limit(5);

  if (error) {
    console.error("[ExportWorker] Failed to fetch export jobs", error);
    return { ok: false, error };
  }

  if (!jobs?.length) return { ok: true, processed: 0 };

  let processed = 0;
  for (const job of jobs) {
    try {
      // Update status to GENERATING
      await admin.from("export_jobs").update({ status: "GENERATING" }).eq("id", job.id);

      // Fetch full project workspace for export
      const { data: workspace, error: wsError } = await admin.rpc("get_project_workspace", { p_project_id: job.project_id });
      if (wsError || !workspace) throw wsError || new Error("Workspace not found");

      let buffer: Buffer;
      let extension: string;
      let contentType: string;

      switch (job.export_type) {
        case "ZIP":
          buffer = await buildSubmissionZip(workspace);
          extension = "zip";
          contentType = "application/zip";
          break;
        case "PDF":
          buffer = await buildProjectSummaryPdf(workspace);
          extension = "pdf";
          contentType = "application/pdf";
          break;
        case "EXCEL":
          const wb = buildTrackerWorkbook(workspace);
          const excelBuffer = await wb.xlsx.writeBuffer();
          buffer = Buffer.from(excelBuffer);
          extension = "xlsx";
          contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
          break;
        default:
          throw new Error(`Unsupported export type: ${job.export_type}`);
      }

      const filePath = `exports/${job.project_id}/${job.id}.${extension}`;
      const { error: uploadError } = await admin.storage.from("project-exports").upload(filePath, buffer, {
        contentType,
        upsert: true
      });

      if (uploadError) throw uploadError;

      // Update to COMPLETED
      await admin
        .from("export_jobs")
        .update({
          status: "COMPLETED",
          file_path: filePath,
          completed_at: new Date().toISOString(),
          attempts: (job.attempts ?? 0) + 1
        })
        .eq("id", job.id);
      
      processed++;
    } catch (err: any) {
      const attempts = (job.attempts ?? 0) + 1;
      const nextStatus = attempts >= 3 ? "FAILED" : "RETRYING";
      
      await admin
        .from("export_jobs")
        .update({
          status: nextStatus,
          last_error: err.message || "Unknown export error",
          attempts
        })
        .eq("id", job.id);
    }
  }

  return { ok: true, processed };
}
