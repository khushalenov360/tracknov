import Link from "next/link";
import { Medal } from "lucide-react";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { categoryMeta } from "@/lib/constants";
import { getDashboardProjects, getProjectWorkspace } from "@/lib/data";
import { scoreIgbcCredits } from "@/lib/igbc-scoring";

export const dynamic = "force-dynamic";

export default async function CreditsPage() {
  const projects = await getDashboardProjects();
  const workspaces = (await Promise.all(projects.map((project) => getProjectWorkspace(project.id))))
    .filter((w): w is NonNullable<typeof w> => w !== null);

  return (
    <Shell
      title="Credit Tracker"
      description="ENOVAIT scoring overview plus Tracknov's detailed IGBC evidence workspace."
      role={projects[0]?.role ?? "consultant"}
      notificationCount={projects.reduce((sum, project) => sum + project.openRemarks, 0)}
    >
      <section className="grid gap-4">
        {workspaces.length ? workspaces.map((workspace) => {
          const score = scoreIgbcCredits(workspace.credits, workspace.project.igbc_variant);
          const mandatory = workspace.credits.filter((credit) => credit.is_mandatory);
          const mandatoryComplete = mandatory.filter((credit) => credit.status === "complete").length;
          return (
            <article key={workspace.project.id} className="surface-card overflow-hidden">
              <div className="grid gap-4 p-5 xl:grid-cols-[240px_minmax(0,1fr)_220px]">
                <div>
                  <div className="flex items-center gap-2 text-[var(--color-green)]">
                    <Medal className="h-4 w-4" />
                    <span className="text-[12px] font-medium">
                      {workspace.project.igbc_variant === "existing" ? "Existing Interiors" : "New Interiors"}
                    </span>
                  </div>
                  <h2 className="mt-2 text-[16px] font-medium text-[var(--color-text-primary)]">
                    {workspace.project.name}
                  </h2>
                  <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
                    Target {workspace.project.target_rating} / {workspace.project.client || "Client TBD"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge className="border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
                      {mandatoryComplete}/{mandatory.length} mandatory
                    </Badge>
                    <Badge className="border border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[var(--color-green)]">
                      {score.level?.level ?? "Below Certified"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
                    <div>
                      <p className="mono text-[34px] font-medium leading-none text-[var(--color-text-primary)]">
                        {score.earned}
                        <span className="text-[16px] text-[var(--color-text-tertiary)]">/{score.totalAvailable}</span>
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                        Credits earned
                      </p>
                    </div>
                    <Progress value={score.percent} />
                    <span className="mono text-[12px] text-[var(--color-text-secondary)]">{score.percent}%</span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {score.categories.map((category) => {
                      const meta = categoryMeta[category.category as keyof typeof categoryMeta];
                      return (
                        <div key={category.category} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 text-[11px] text-[var(--color-text-secondary)]">
                              <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                              {category.category}
                            </span>
                            <span className="mono text-[11px] text-[var(--color-text-primary)]">
                              {category.earned}/{category.total}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col justify-center gap-2">
                  <Button asChild className="rounded-md">
                    <Link href={`/projects/${workspace.project.id}`}>Open detailed tracker</Link>
                  </Button>
                  <Button asChild variant="secondary" className="rounded-md">
                    <Link href={`/documents?project=${workspace.project.id}`}>View documents</Link>
                  </Button>
                  <Button asChild variant="secondary" className="rounded-md">
                    <Link href={`/projects/${workspace.project.id}/submission`}>Submission pack</Link>
                  </Button>
                </div>
              </div>
            </article>
          );
        }) : (
          <article className="surface-card p-6">
            <h3 className="text-[14px] font-medium text-[var(--color-text-primary)]">No scoring data yet</h3>
            <p className="mt-2 text-[12px] text-[var(--color-text-secondary)]">
              Add or join a project first, then this page will show category-wise points and mandatory credit progress.
            </p>
          </article>
        )}
      </section>
    </Shell>
  );
}
