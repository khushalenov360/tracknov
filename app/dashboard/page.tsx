import Link from "next/link";
import { createProjectAction } from "@/app/actions";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { getCurrentUser, getDashboardProjects } from "@/lib/data";
import { igbcRatingSystemGroups, roleLabels } from "@/lib/constants";
import { pct } from "@/lib/utils";

export default async function DashboardPage() {
  const [user, projects] = await Promise.all([getCurrentUser(), getDashboardProjects()]);
  const canCreateProject = ["super_user", "super_admin"].includes(user?.role ?? "");
  const activeRole = user?.role ?? "consultant";

  const totals = {
    totalCredits: projects.reduce((sum, project) => sum + project.totalCredits, 0),
    uploadedDocs: projects.reduce((sum, project) => sum + project.uploadedDocs, 0),
    mandatoryCreditsMet: projects.reduce((sum, project) => sum + project.mandatoryCreditsMet, 0),
    openRemarks: projects.reduce((sum, project) => sum + project.openRemarks, 0),
  };

  return (
    <Shell
      title={`${roleLabels[activeRole]} Dashboard`}
      description="Overview of active projects, documentation progress, and review status."
      role={activeRole}
      notificationCount={projects.reduce((sum, project) => sum + project.openRemarks, 0)}
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Tracked credits", value: totals.totalCredits, meta: `${projects.length} active projects` },
          { label: "Docs uploaded", value: totals.uploadedDocs, meta: "Across all workspaces" },
          { label: "Mandatory met", value: totals.mandatoryCreditsMet, meta: "Ready for submission checks" },
          { label: "Open remarks", value: totals.openRemarks, meta: "Needs consultant review" },
        ].map((item) => (
          <div key={item.label} className="surface-card p-4">
            <p className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
              {item.label}
            </p>
            <p className="mono mt-2 text-[28px] font-medium leading-none text-[var(--color-text-primary)]">
              {item.value}
            </p>
            <p className="mt-2 text-[11px] text-[var(--color-text-tertiary)]">{item.meta}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 surface-card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[13px] font-medium text-[var(--color-text-primary)]">Projects</h2>
            <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
              Open any project to view section-wise progress and completion.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {projects.map((project) => (
              <Button key={project.id} asChild variant="secondary" className="rounded-md px-3 text-[12px]">
                <Link href={`/projects/${project.id}`}>{project.name}</Link>
              </Button>
            ))}
          </div>
        </div>
      </section>

      {canCreateProject ? (
      <section className="surface-card mt-4 p-4">
        <form action={createProjectAction} className="grid gap-3 lg:grid-cols-[minmax(260px,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)_180px_auto]">
          <select
            name="rating_system"
            required
            className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
            defaultValue="IGBC Green Interiors"
          >
            {igbcRatingSystemGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.systems.map((system) => (
                  <option key={system} value={system}>
                    {system}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <Input name="name" placeholder="Project name" required />
          <Input name="client" placeholder="Client" required />
          <Input name="location" placeholder="Location" required />
          <Button type="submit" className="h-[34px] rounded-md px-4">
            Create project
          </Button>
          <input type="hidden" name="project_type" value="commercial" />
          <input type="hidden" name="status" value="active" />
          <input type="hidden" name="green_certification" value="IGBC" />
          <input type="hidden" name="igbc_variant" value="new" />
          <input type="hidden" name="target_rating" value="Certified" />
        </form>
      </section>
      ) : null}

      <section className="mt-4 grid gap-3">
        {projects.map((project) => (
          <article key={project.id} className="surface-card flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[15px] font-medium text-[var(--color-text-primary)]">{project.client || "Project workspace"}</p>
                <Badge className="border border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[11px] text-[var(--color-green)]">
                  {project.target_rating}
                </Badge>
                <Badge className="border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[11px] text-[var(--color-text-secondary)]">
                  {roleLabels[project.role]}
                </Badge>
              </div>
              <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">
                {project.certification_type} / {project.location || "Location TBD"}
              </p>
              <p className="mt-3 text-[12px] text-[var(--color-text-secondary)]">
                {project.totalCredits} credits · {project.uploadedDocs} docs · {project.mandatoryCreditsMet} mandatory
                met · {project.openRemarks} remarks · {project.membersCount} members
              </p>
              <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
                <Progress value={project.overallCompletion} />
                <span className="mono text-[12px] text-[var(--color-text-secondary)]">
                  {pct(project.overallCompletion)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 lg:justify-end">
              <Button asChild className="rounded-md px-3 text-[12px]">
                <Link href={`/projects/${project.id}`}>Open workspace</Link>
              </Button>
              <Button asChild variant="secondary" className="rounded-md px-3 text-[12px]">
                <Link href={`/projects/${project.id}/submission`}>Submission pack</Link>
              </Button>
            </div>
          </article>
        ))}
      </section>
    </Shell>
  );
}
