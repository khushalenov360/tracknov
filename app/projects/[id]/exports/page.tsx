import Link from "next/link";
import { Download } from "lucide-react";
import { uploadProjectGuidebookAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { getProjectWorkspace } from "@/lib/data";
import { canManageProjectGuidebook } from "@/lib/rbac";
import { formatDateTimeIST } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectExportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const workspace = await getProjectWorkspace(projectId);

  if (!workspace) return null;

  const canManageGuidebook = canManageProjectGuidebook(workspace.userRole);

  return (
    <div className="space-y-6 text-left">
      <div className="surface-card p-4 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-primary)]">
          Reference Guidebooks
        </h3>
        {canManageGuidebook && (
          <form action={uploadProjectGuidebookAction} encType="multipart/form-data" className="flex gap-2 items-center flex-wrap bg-[var(--color-surface-2)] p-3 rounded-lg border border-[var(--color-border)]">
            <input type="hidden" name="project_id" value={projectId} />
            <input name="guidebook" type="file" accept=".pdf,application/pdf" required className="text-xs" />
            <Button type="submit" className="h-8 text-xs rounded-lg bg-[var(--color-green)] text-white hover:bg-[var(--color-green-dim)]">
              Upload Reference
            </Button>
          </form>
        )}

        <div className="space-y-2">
          {workspace.guidebooks?.length ? (
            workspace.guidebooks.map((guide: any) => (
              <div key={guide.id} className="flex justify-between items-center p-3 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-2)] text-xs">
                <div>
                  <p className="font-bold text-[var(--color-text-primary)]">{guide.file_name}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">{formatDateTimeIST(guide.created_at)}</p>
                </div>
                {guide.signed_url && (
                  <a href={guide.signed_url} target="_blank" rel="noreferrer" className="text-[var(--color-green)] font-bold hover:underline">
                    Download PDF
                  </a>
                )}
              </div>
            ))
          ) : (
            <p className="text-xs text-[var(--color-text-tertiary)]">No guidebook files uploaded.</p>
          )}
        </div>
      </div>

      <div className="surface-card p-4 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-primary)]">
          Submission Packs & Reports
        </h3>
        <p className="text-xs text-[var(--color-text-secondary)] max-w-[640px] leading-relaxed">
          Export the current IGBC credit readiness tracker checklist or generate a comprehensive certification preflight PDF report.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="secondary" asChild className="h-8 text-xs px-3.5 rounded-lg">
            <Link href={`/api/projects/${projectId}/tracker`}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export XLSX Tracker
            </Link>
          </Button>
          <Button variant="secondary" asChild className="h-8 text-xs px-3.5 rounded-lg">
            <Link href={`/api/projects/${projectId}/summary`}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> PDF Executive Summary
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
