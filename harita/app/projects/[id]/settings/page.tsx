import Link from "next/link";
import SettingsForms from "@/components/project/settings-forms";
import { getProjectWorkspace } from "@/lib/data";
import { canManageProjectGuidebook } from "@/lib/rbac";
import { formatDateTimeIST } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const workspace = await getProjectWorkspace(projectId);

  if (!workspace) return null;

  const canManageGuidebook = canManageProjectGuidebook(workspace.userRole);

  if (!canManageGuidebook) {
    return (
      <div className="surface-card p-4 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-primary)]">
          Settings & Maintenance
        </h3>
        <div className="surface-card p-4 text-[13px] text-[var(--color-text-secondary)]">
        You do not have permission to manage guidebook and tracker settings.
      </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <div className="surface-card p-4 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-primary)]">
          Project Guidebook & Tracker Maintenance
        </h3>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Upload the project guidebook to instantiate requirements, and import the tracker to establish the baseline mapping.
        </p>

        <SettingsForms 
          projectId={projectId} 
          hasGuidebook={!!workspace.guidebooks?.length}
          hasDataTable={!!workspace.data_tables?.length}
          hasTracker={workspace.credits.some((c: any) => c.documents_required?.length > 0)}
        />

        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <h4 className="text-[12px] font-medium mb-3">Currently Uploaded Baseline Assets</h4>
          <div className="space-y-2">
            {!workspace.guidebooks?.length && !workspace.data_tables?.length && !workspace.credits.some((c: any) => c.documents_required?.length > 0) && (
              <p className="text-xs text-[var(--color-text-tertiary)]">No baseline assets uploaded yet.</p>
            )}

            {workspace.guidebooks?.map((guide: any) => (
              <div key={guide.id} className="flex justify-between items-center p-3 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-2)] text-xs">
                <div>
                  <p className="font-bold text-[var(--color-text-primary)]">Guidebook: {guide.file_name}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">{formatDateTimeIST(guide.created_at)}</p>
                </div>
                {guide.signed_url && (
                  <a href={guide.signed_url} target="_blank" rel="noreferrer" className="text-[var(--color-green)] font-bold hover:underline">
                    Download PDF
                  </a>
                )}
              </div>
            ))}

            {workspace.data_tables?.map((dt: any) => (
              <div key={dt.id} className="flex justify-between items-center p-3 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-2)] text-xs">
                <div>
                  <p className="font-bold text-[var(--color-text-primary)]">Data Table: {dt.file_name}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">{formatDateTimeIST(dt.created_at)}</p>
                </div>
                {dt.signed_url && (
                  <a href={dt.signed_url} target="_blank" rel="noreferrer" className="text-blue-500 font-bold hover:underline">
                    Download File
                  </a>
                )}
              </div>
            ))}

            {workspace.credits.some((c: any) => c.documents_required?.length > 0) && (
              <div className="flex justify-between items-center p-3 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-2)] text-xs">
                <div>
                  <p className="font-bold text-[var(--color-text-primary)]">Tracker Baseline</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">Document requirements seeded</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
