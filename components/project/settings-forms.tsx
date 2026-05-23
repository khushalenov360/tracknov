"use client";

import { useTransition } from "react";
import { uploadProjectGuidebookAction, importProjectTrackerBaselineAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export default function SettingsForms({ projectId }: { projectId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleGuidebookUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await uploadProjectGuidebookAction(formData);
    });
  };

  const handleTrackerUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await importProjectTrackerBaselineAction(formData);
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Guidebook Form */}
      <div className="bg-[var(--color-surface-2)] p-5 rounded-xl border border-[var(--color-border)] shadow-sm flex flex-col justify-between">
        <div>
          <p className="text-[13px] font-bold text-[var(--color-text-primary)] mb-1">1. Upload Guidebook</p>
          <p className="text-[11px] text-[var(--color-text-tertiary)] mb-4">Required to instantiate requirements (PDF, max 250MB).</p>
        </div>
        <form onSubmit={handleGuidebookUpload} className="flex flex-col gap-3">
          <input type="hidden" name="project_id" value={projectId} />
          <input name="guidebook" type="file" accept=".pdf,application/pdf" required className="w-full text-xs text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] p-2 overflow-hidden text-ellipsis cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-[var(--color-border)] file:text-[var(--color-text-primary)] hover:file:bg-[var(--color-text-tertiary)] hover:file:text-white transition-all" />
          <Button type="submit" disabled={isPending} className="h-9 text-[13px] font-semibold rounded-lg bg-[var(--color-green)] text-white hover:bg-[var(--color-green-dim)] w-full">
            {isPending ? "Uploading..." : "Upload Guidebook"}
          </Button>
        </form>
      </div>

      {/* Tracker Form */}
      <div className="bg-[var(--color-surface-2)] p-5 rounded-xl border border-[var(--color-border)] shadow-sm flex flex-col justify-between">
        <div>
          <p className="text-[13px] font-bold text-[var(--color-text-primary)] mb-1">2. Import Tracker Baseline</p>
          <p className="text-[11px] text-[var(--color-text-tertiary)] mb-4">Establish the baseline mapping (Excel).</p>
        </div>
        <form onSubmit={handleTrackerUpload} className="flex flex-col gap-3">
          <input type="hidden" name="project_id" value={projectId} />
          <input name="tracker_file" type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" required className="w-full text-xs text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] p-2 overflow-hidden text-ellipsis cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-[var(--color-border)] file:text-[var(--color-text-primary)] hover:file:bg-[var(--color-text-tertiary)] hover:file:text-white transition-all" />
          <Button type="submit" variant="secondary" disabled={isPending} className="h-9 text-[13px] font-semibold rounded-lg w-full">
            {isPending ? "Importing..." : "Import Tracker"}
          </Button>
        </form>
      </div>
    </div>
  );
}
