import Link from "next/link";
import { createProjectAction, deleteProjectAction, updateProjectAction } from "@/app/actions";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { igbcRatingSystemGroups, projectStatuses, projectTypes, roleLabels } from "@/lib/constants";
import { getCurrentUser, getDashboardProjects } from "@/lib/data";
import { canCreateProjects, canDeleteProjects, canManageProject } from "@/lib/rbac";
import { pct } from "@/lib/utils";

export default async function ProjectsPage() {
  const [user, projects] = await Promise.all([getCurrentUser(), getDashboardProjects()]);
  const canCreateProject = canCreateProjects(user?.role);
  const canDeleteAnyProject = canDeleteProjects(user?.role);
  const activeRole = user?.role ?? projects[0]?.role ?? "consultant";

  return (
    <Shell
      title="Projects"
      description="Combined Tracknov and ENOVAIT project portfolio with certification targets, team counts, documents, and tracker progress."
      role={activeRole}
      notificationCount={projects.reduce((sum, project) => sum + project.openRemarks, 0)}
    >
      {canCreateProject ? (
      <section className="surface-card p-4">
        <form action={createProjectAction} className="grid gap-3 xl:grid-cols-[minmax(260px,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_180px_auto]">
          <select name="rating_system" defaultValue="IGBC Green Interiors" required className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]">
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
            New project
          </Button>
          <input type="hidden" name="project_type" value="commercial" />
          <input type="hidden" name="status" value="active" />
          <input type="hidden" name="green_certification" value="IGBC" />
          <input type="hidden" name="igbc_variant" value="new" />
          <input type="hidden" name="target_rating" value="Certified" />
        </form>
      </section>
      ) : null}

      <section className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {projects.map((project) => (
          <article key={project.id} className="surface-card overflow-hidden">
            <div className="h-1 bg-[var(--color-green)]" />
            <div className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-[15px] font-medium text-[var(--color-text-primary)]">
                    {project.name}
                  </h2>
                  <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
                    {project.client || "Client TBD"} / {project.location || "Location TBD"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge className="max-w-[220px] truncate border border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[var(--color-green)]">
                    {project.certification_type}
                  </Badge>
                  <Badge className="border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
                    {projectStatuses[project.status]}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--color-text-secondary)]">
                <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
                  <p className="dense-label">Role</p>
                  <p className="mt-1">{roleLabels[project.role]}</p>
                </div>
                <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
                  <p className="dense-label">Type</p>
                  <p className="mt-1">{projectTypes[project.project_type]}</p>
                </div>
                <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
                  <p className="dense-label">Documents</p>
                  <p className="mono mt-1">{project.uploadedDocs}</p>
                </div>
                <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
                  <p className="dense-label">Members</p>
                  <p className="mono mt-1">{project.membersCount}</p>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                <Progress value={project.overallCompletion} />
                <span className="mono text-[12px] text-[var(--color-text-secondary)]">
                  {pct(project.overallCompletion)}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild className="rounded-md px-3 text-[12px]">
                  <Link href={`/projects/${project.id}`}>Open workspace</Link>
                </Button>
                <Button asChild variant="secondary" className="rounded-md px-3 text-[12px]">
                  <Link href={`/projects/${project.id}/submission`}>Submission pack</Link>
                </Button>
                <Button asChild variant="secondary" className="rounded-md px-3 text-[12px]">
                  <Link href={`/documents?project=${project.id}`}>Documents</Link>
                </Button>
              </div>

              {canManageProject(project.role) ? (
                <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-medium text-[var(--color-text-primary)]">Project controls</p>
                      <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                        {canDeleteAnyProject
                          ? "Super User can update and delete this project."
                          : "Project Admin access includes project updates for assigned workspaces."}
                      </p>
                    </div>
                    <Badge className="border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
                      {roleLabels[project.role]}
                    </Badge>
                  </div>

                  <form action={updateProjectAction} className="grid gap-3">
                    <input type="hidden" name="project_id" value={project.id} />
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input name="name" defaultValue={project.name} required />
                      <Input name="client" defaultValue={project.client} required />
                    </div>
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px]">
                      <Input name="location" defaultValue={project.location} required />
                      <select
                        name="rating_system"
                        defaultValue={project.certification_type}
                        required
                        className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
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
                      <select
                        name="status"
                        defaultValue={project.status}
                        className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
                      >
                        {Object.entries(projectStatuses).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" variant="secondary" className="rounded-md px-3 text-[12px]">
                        Update project
                      </Button>
                    </div>
                  </form>
                  {canDeleteAnyProject ? (
                    <form action={deleteProjectAction} className="mt-2">
                      <input type="hidden" name="project_id" value={project.id} />
                      <Button type="submit" variant="danger" className="rounded-md px-3 text-[12px]">
                        Delete project
                      </Button>
                    </form>
                  ) : null}
                </section>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </Shell>
  );
}
