import Link from "next/link";
import { StageGateTracker } from "@/components/project/StageGateTracker";
import { Progress } from "@/components/ui/progress";
import { creditStats, getProjectWorkspace } from "@/lib/data";
import { stageGateService } from "@/lib/services/stage-gate-service";
import { formatDateTimeIST } from "@/lib/utils";
import { toLegacyCreditStatus } from "@/lib/workflow-utils";
import { AiGroundingUploads } from "@/components/project/ai-grounding-uploads";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id: projectId } = await params;
  const resolvedSearchParams = await searchParams;
  const errorMsg = resolvedSearchParams.error as string | undefined;
  const successMsg = resolvedSearchParams.success as string | undefined;
  const workspace = await getProjectWorkspace(projectId);

  if (!workspace) return null;

  const isL0Contributor = ["mep", "architect", "contractor"].includes(workspace.userRole);
  const roleScopedCredits = isL0Contributor
    ? workspace.credits.filter((credit: any) => !credit.responsible_role || credit.responsible_role === workspace.userRole)
    : workspace.credits;

  const stats = creditStats(roleScopedCredits);

  const categoryProgress = stats.categories;

  const milestones = await stageGateService.getMilestones(projectId);

  const activeGuidebook = workspace.guidebooks?.[0];
  const guidebookName = activeGuidebook?.title || activeGuidebook?.file_name;
  const hasTracker = (workspace.credits ?? []).some((c: any) => c.responsible_role !== null || c.what_to_submit !== null);

  return (
    <div className="space-y-6 text-left">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-[13px] font-bold text-red-900">Operation Failed</h4>
            <p className="text-[12px] text-red-700 mt-1">{errorMsg}</p>
          </div>
        </div>
      )}
      
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-[13px] font-bold text-emerald-900">Success</h4>
            <p className="text-[12px] text-emerald-700 mt-1">{successMsg}</p>
          </div>
        </div>
      )}

      <StageGateTracker milestones={milestones} />

      <div className="space-y-6">
        <div className="surface-card p-4 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-primary)]">
            Category Completion
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {categoryProgress.map((item) => (
              <Link
                key={item.key}
                href={`/projects/${projectId}/credits?category=${item.key}`}
                className="border border-[var(--color-border)] rounded-lg p-3.5 hover:border-[var(--color-border-strong)] transition-all bg-[var(--color-surface-2)]"
              >
                <div className="flex justify-between items-center text-xs font-bold text-[var(--color-text-primary)] mb-1.5">
                  <span>{item.label}</span>
                  <span>{item.avgCompletion}%</span>
                </div>
                <Progress value={item.avgCompletion} />
                <div className="mt-2.5 flex justify-between text-xs font-semibold text-[var(--color-text-tertiary)]">
                  <span>{item.completed} / {item.count} Complete</span>
                  <span>{item.blocked} Blocked</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
        
        <AiGroundingUploads 
          projectId={projectId} 
          guidebookName={workspace.guidebooks?.[0]?.file_name}
          dataTableName={workspace.data_tables?.[0]?.file_name}
          hasTracker={workspace.credits.some((c: any) => c.documents_required?.length > 0)}
        />
      </div>
    </div>
  );
}
