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

        <SettingsForms projectId={projectId} />

        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <h4 className="text-[12px] font-medium mb-3">Currently Uploaded Guidebooks</h4>
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
      </div>
    </div>
  );
}
