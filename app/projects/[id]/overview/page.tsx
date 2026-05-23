import Link from "next/link";
import { StageGateTracker } from "@/components/project/StageGateTracker";
import { Progress } from "@/components/ui/progress";
import { creditStats, getProjectWorkspace } from "@/lib/data";
import { stageGateService } from "@/lib/services/stage-gate-service";
import { formatDateTimeIST } from "@/lib/utils";
import { toLegacyCreditStatus } from "@/lib/workflow-utils";
import { AiGroundingUploads } from "@/components/project/ai-grounding-uploads";

export const dynamic = "force-dynamic";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const workspace = await getProjectWorkspace(projectId);

  if (!workspace) return null;

  const isL0Contributor = ["mep", "architect", "contractor"].includes(workspace.userRole);
  const roleScopedCredits = isL0Contributor
    ? workspace.credits.filter((credit: any) => !credit.responsible_role || credit.responsible_role === workspace.userRole)
    : workspace.credits;

  const stats = creditStats(roleScopedCredits);

  const categoryProgress = stats.categories.map((item) => {
    const categoryCredits = roleScopedCredits.filter((credit: any) => credit.category === item.key);
    const completed = categoryCredits.filter((credit: any) => toLegacyCreditStatus(credit.state ?? credit.status) === "complete").length;
    const inProgress = categoryCredits.filter((credit: any) => toLegacyCreditStatus(credit.state ?? credit.status) === "in_progress").length;
    const blocked = categoryCredits.filter((credit: any) => toLegacyCreditStatus(credit.state ?? credit.status) === "blocked").length;
    const avgCompletion = categoryCredits.length
      ? Math.round(
          categoryCredits.reduce((sum: number, credit: any) => sum + Number(credit.completion_pct ?? 0), 0) /
            categoryCredits.length,
        )
      : 0;
    return {
      ...item,
      completed,
      inProgress,
      blocked,
      avgCompletion,
    };
  });

  const milestones = await stageGateService.getMilestones(projectId);

  return (
    <div className="space-y-6 text-left">
      <StageGateTracker milestones={milestones} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
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
        </div>

        <div className="space-y-6">
          <div className="surface-card p-4 space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-secondary)]">
              Project Parameters
            </h3>
            <div className="text-xs font-bold text-[var(--color-text-primary)] space-y-1">
              <p>Type: {workspace.project.certification_type}</p>
              <p>Target Rating: {workspace.project.target_rating}</p>
              <p>Location: {workspace.project.location || "TBD"}</p>
            </div>
          </div>

          <AiGroundingUploads projectId={projectId} />

          <div className="surface-card p-4 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-secondary)]">
              Activity Feed
            </h3>
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {(workspace.activityLogs ?? []).length > 0 ? (
                (workspace.activityLogs ?? []).slice(0, 6).map((log: any) => (
                  <div key={log.id} className="text-xs border-b border-[var(--color-border)] pb-2 last:border-0 last:pb-0">
                    <p className="font-semibold text-[var(--color-text-primary)] leading-snug">{log.summary}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                      {formatDateTimeIST(log.created_at)} · {log.actor_role}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[var(--color-text-tertiary)]">No activity logged.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
