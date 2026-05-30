import Link from "next/link";
import { Download } from "lucide-react";
import { uploadProjectGuidebookAction } from "@/app/actions";
import { Button } from "@tracknov/ui/ui/button";
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
