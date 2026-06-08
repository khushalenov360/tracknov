"use client";

import { useFormStatus } from "react-dom";
import { Upload, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { uploadProjectGuidebookAction, importProjectTrackerBaselineAction, uploadProjectDataTableAction } from "@/app/actions";
import { Button } from "@/components/ui-lib/ui/button";

function GuidebookSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-7 text-[11px] px-3" disabled={pending}>
      {pending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
      Upload
    </Button>
  );
}

function TrackerSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" className="h-7 text-[11px] px-3 border border-[var(--color-border)]" disabled={pending}>
      {pending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
      Import
    </Button>
  );
}

function DataTableSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-7 text-[11px] px-3 bg-blue-600 hover:bg-blue-700 text-white" disabled={pending}>
      {pending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
      Upload
    </Button>
  );
}

export function AiGroundingUploads({ 
  projectId,
  guidebookName,
  hasTracker,
  dataTableName
}: { 
  projectId: string;
  guidebookName?: string;
  hasTracker?: boolean;
  dataTableName?: string;
}) {

  return (
    <div className="surface-card p-4 space-y-5">
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 mb-1 flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Guide & Tracker Maintenance
        </h3>
        <p className="text-[12px] text-[var(--color-text-secondary)]">
          Assign the project guidebook, data table template, and upload the baseline tracker used for certification.
        </p>
      </div>

      <div className="space-y-4">
        {/* Guidebook Form */}
        {guidebookName ? (
          <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-indigo-500 shrink-0" />
              <div>
                <h4 className="text-[13px] font-bold text-[var(--color-text-primary)]">Project Guide Book</h4>
                <p className="text-[11px] text-[var(--color-text-secondary)] font-medium">Mapped to: {guidebookName}</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-1 bg-[var(--color-surface-3)] rounded text-[var(--color-text-tertiary)]">Locked</span>
          </div>
        ) : (
          <form action={uploadProjectGuidebookAction} className="space-y-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]">
            <div className="flex items-start gap-2">
              <FileText className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-[13px] font-bold text-[var(--color-text-primary)]">Project Guide Book</h4>
                <p className="text-[11px] text-[var(--color-text-tertiary)] mb-2">Upload the main PDF rulebook (Max 50MB).</p>
                
                <input type="hidden" name="project_id" value={projectId} />
                
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    name="title"
                    placeholder="Optional Title (e.g. IGBC Core Shell v3)"
                    className="w-full text-xs px-3 py-1.5 rounded border border-[var(--color-border)] focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      name="guidebook"
                      accept=".pdf"
                      required
                      className="flex-1 min-w-0 text-[11px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                    />
                    <GuidebookSubmitButton />
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Data Table Form */}
        {dataTableName ? (
          <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-blue-500 shrink-0" />
              <div>
                <h4 className="text-[13px] font-bold text-[var(--color-text-primary)]">Data Table Template</h4>
                <p className="text-[11px] text-[var(--color-text-secondary)] font-medium">Mapped to: {dataTableName}</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-1 bg-[var(--color-surface-3)] rounded text-[var(--color-text-tertiary)]">Locked</span>
          </div>
        ) : (
          <form action={uploadProjectDataTableAction} className="space-y-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]">
            <div className="flex items-start gap-2">
              <FileSpreadsheet className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-[13px] font-bold text-[var(--color-text-primary)]">Data Table Template</h4>
                <p className="text-[11px] text-[var(--color-text-tertiary)] mb-2">Upload the data table template (.xlsx/.xls/.csv).</p>
                
                <input type="hidden" name="project_id" value={projectId} />
                
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    name="title"
                    placeholder="Optional Title (e.g. Project Data Table)"
                    className="w-full text-xs px-3 py-1.5 rounded border border-[var(--color-border)] focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      name="data_table"
                      accept=".xlsx,.xls,.csv"
                      required
                      className="flex-1 min-w-0 text-[11px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
                    />
                    <DataTableSubmitButton />
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Tracker Form */}
        {hasTracker ? (
          <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-[var(--color-green)] shrink-0" />
              <div>
                <h4 className="text-[13px] font-bold text-[var(--color-text-primary)]">Tracker Baseline</h4>
                <p className="text-[11px] text-[var(--color-text-secondary)] font-medium">Document requirements seeded</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-1 bg-[var(--color-surface-3)] rounded text-[var(--color-text-tertiary)]">Locked</span>
          </div>
        ) : (
          <form action={importProjectTrackerBaselineAction} className="space-y-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]">
            <div className="flex items-start gap-2">
              <FileSpreadsheet className="h-5 w-5 text-[var(--color-green)] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-[13px] font-bold text-[var(--color-text-primary)]">Tracker Baseline</h4>
                <p className="text-[11px] text-[var(--color-text-tertiary)] mb-2">Import an Excel tracker to seed document requirements (.xlsx/.xls).</p>
                
                <input type="hidden" name="project_id" value={projectId} />
                
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    name="tracker_file"
                    accept=".xlsx,.xls"
                    required
                    className="flex-1 min-w-0 text-[11px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                  <TrackerSubmitButton />
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
