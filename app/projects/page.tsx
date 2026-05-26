import Link from "next/link";
import {
  createProjectTopupInvoiceAction,
  createProjectAction,
  deleteProjectAction,
  importProjectTrackerBaselineAction,
  joinProjectAction,
  logConsultantSessionAction,
  uploadProjectGuidebookAction,
  updateProjectAction,
  updateProjectPlanSettingsAction,
  leaveProjectAction,
} from "@/app/actions";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { igbcRatingSystemGroups, projectStatuses, projectTypes, roleLabels } from "@/lib/constants";
import { getActiveSubscriptionPlans, getCurrentUser, getDashboardProjects, getRatingSystems } from "@/lib/data";
import { canCreateProjects, canDeleteProjects, canEditPlanControls, canManageProject, canManageTokens } from "@/lib/rbac";
import { pct } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProjectsPage({ searchParams }: { searchParams?: Promise<{ error?: string, tab?: string }> }) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const error = resolvedSearchParams.error;
  const activeTab = resolvedSearchParams.tab ?? "active";
  
  const [user, projects, plans, ratingSystems] = await Promise.all([
    getCurrentUser(),
    getDashboardProjects(),
    getActiveSubscriptionPlans(),
    getRatingSystems(),
  ]);
  const canCreateProject = canCreateProjects(user?.role);
  const canDeleteAnyProject = canDeleteProjects(user?.role);
  const canEditPlan = canEditPlanControls(user?.role);
  const canManageTokenControls = canManageTokens(user?.role);
  const activeRole = user?.role ?? projects[0]?.role ?? "consultant";
  const isL3OrAbove = ["project_admin", "super_admin", "super_user", "L3", "L5"].includes(activeRole);
  const billingTotals = projects.reduce(
    (acc, project) => {
      acc.docUsed += project.documentCreditsUsed ?? 0;
      acc.docRemaining += project.documentCreditsRemaining ?? 0;
      acc.consultantUsed += project.consultantCreditsUsed ?? 0;
      acc.consultantRemaining += project.consultantCreditsRemaining ?? 0;
      return acc;
    },
    { docUsed: 0, docRemaining: 0, consultantUsed: 0, consultantRemaining: 0 },
  );

  return (
    <Shell
      title="Projects"
      description="Your Tracknov project portfolio with certification targets, team counts, documents, and tracker progress."
      role={activeRole}
      notificationCount={projects.reduce((sum, project) => sum + project.openRemarks, 0)}
    >
      {error && (
        <div className="mb-4 rounded-md border border-[var(--color-red-light)] bg-[var(--color-red-soft)] p-3 text-[12px] text-[var(--color-red)]">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)] mb-6">
        <Link
          href="/projects"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "active"
              ? "border-[var(--color-green)] text-[var(--color-text-primary)]"
              : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]"
          }`}
        >
          Active Projects
        </Link>
        <Link
          href="/projects?tab=templates"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "templates"
              ? "border-[var(--color-green)] text-[var(--color-text-primary)]"
              : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]"
          }`}
        >
          Templates
        </Link>
        <Link
          href="/projects?tab=archives"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "archives"
              ? "border-[var(--color-green)] text-[var(--color-text-primary)]"
              : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]"
          }`}
        >
          Archives
        </Link>
      </div>

      {activeTab === "templates" && (
        <section className="surface-card p-6">
          <h3 className="text-[16px] font-medium text-[var(--color-text-primary)]">Project Templates</h3>
          <p className="mt-2 text-[13px] text-[var(--color-text-secondary)]">
            Start a new project quickly from a predefined baseline template. Templates configure your documentation targets, workflows, and credits automatically.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center p-12 border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-surface-2)]">
            <span className="text-[var(--color-text-tertiary)] mb-4">No templates available yet.</span>
            {canCreateProject && (
              <Button variant="secondary" className="h-[34px] rounded-md px-4 text-xs">
                Create Template
              </Button>
            )}
          </div>
        </section>
      )}

      {activeTab === "archives" && (
        <section className="surface-card p-6">
          <h3 className="text-[16px] font-medium text-[var(--color-text-primary)]">Archived Projects</h3>
          <p className="mt-2 text-[13px] text-[var(--color-text-secondary)]">
            Projects that have completed their certification lifecycle or have been retired.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center p-12 border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-surface-2)]">
            <span className="text-[var(--color-text-tertiary)]">No archived projects.</span>
          </div>
        </section>
      )}

      {activeTab === "active" && (
        <>

      {isL3OrAbove ? (
        <section className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 p-6 rounded-3xl space-y-4 mb-6 relative overflow-hidden group">
          {/* Subtle ambient light glow behind card */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-b from-indigo-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />
          
          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
                <h2 className="text-sm font-black uppercase tracking-wider bg-gradient-to-r from-indigo-200 to-slate-200 bg-clip-text text-transparent">
                  Project Admin Cockpit
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Cross-project validation queue, readiness tracking, and priority signals.
              </p>
            </div>
            <Button asChild className="h-[34px] rounded-xl px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/10 transition-all hover:scale-[1.02]">
              <Link href="/review-queue">Open validation queue</Link>
            </Button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-850 bg-slate-950/40 backdrop-blur-md relative z-10">
            <table className="min-w-full border-collapse text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-850/80 bg-slate-950/60">
                  {["Project", "Project Code", "Progress", "Pending", "Rejections", "Readiness"].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-wider text-slate-400">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60">
                {projects.map((project) => {
                  const pendingValidation = Number(project.pendingReviewsCount ?? 0);
                  const rejections = Number(project.rejectedCount ?? 0);
                  const ready = pendingValidation === 0 && rejections === 0 && project.overallCompletion >= 95;
                  return (
                    <tr key={project.id} className="hover:bg-slate-900/30 transition-all group/row">
                      <td className="px-4 py-3 font-semibold">
                        <Link href={`/projects/${project.id}`} className="text-slate-200 hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                          <span>{project.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded-lg bg-slate-950/80 border border-slate-850/80 px-2 py-0.5 text-xs font-mono text-slate-400">
                          {project.projectCode}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="relative w-16 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                            <div 
                              className={`h-full rounded-full bg-gradient-to-r ${ready ? 'from-emerald-500 to-teal-400' : 'from-indigo-500 to-indigo-400'}`}
                              style={{ width: `${project.overallCompletion}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-400 text-xs">
                            {pct(project.overallCompletion)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold">
                        {pendingValidation > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-xs">
                            {pendingValidation}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold">
                        {rejections > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-xs">
                            {rejections}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span 
                          className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${
                            ready
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                              : "border-indigo-500/20 bg-indigo-500/10 text-indigo-400"
                          }`}
                        >
                          {ready ? "Ready" : "Pending Action"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {canCreateProject ? (
        <section className="surface-card mt-4 p-4">
          <div className="max-w-md">
            <h3 className="text-[12px] font-medium mb-3">Create new project</h3>
            <form action={createProjectAction} className="grid gap-3">
              <select name="rating_system_id" required className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]">
                <option value="">Select Rating System</option>
                {ratingSystems.map((rs) => (
                  <option key={rs.id} value={rs.id}>
                    {rs.name}{rs.version ? ` ${rs.version}` : ""}
                  </option>
                ))}
              </select>
              <Input name="name" placeholder="Project name" required />
              <div className="grid grid-cols-2 gap-3">
                <Input name="client" placeholder="Client" required />
                <Input name="location" placeholder="Location" required />
              </div>
              <Button type="submit" className="h-[34px] rounded-md px-4">
                New project
              </Button>
              <input type="hidden" name="project_type" value="commercial" />
              <input type="hidden" name="status" value="active" />
              <input type="hidden" name="green_certification" value="IGBC" />
              <input type="hidden" name="igbc_variant" value="new" />
              <input type="hidden" name="target_rating" value="Certified" />
            </form>
          </div>
        </section>
      ) : null}

      {!["super_user", "super_admin"].includes(activeRole) && (
        <section className="surface-card mt-4 p-4">
          <div className="max-w-md">
            <h3 className="text-[12px] font-medium mb-3">Join with project code</h3>
            <p className="text-xs text-[var(--color-text-secondary)] mb-4">Enter the human-readable project code (e.g. TN-DEMO-MUM-001) provided by your project admin.</p>
            <form action={joinProjectAction} className="flex gap-2">
              <Input name="projectCode" placeholder="TN-XXXX-XXX-000" className="uppercase" required />
              <Button type="submit" variant="secondary" className="h-[34px]">Join</Button>
            </form>
          </div>
        </section>
      )}

      <section className="mt-4 surface-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[13px] font-medium text-[var(--color-text-primary)]">Billing credits overview</h2>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Live usage across all visible projects.
            </p>
          </div>
          <Badge className="border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </Badge>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
            <p className="dense-label">Document credits used</p>
            <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{billingTotals.docUsed}</p>
          </div>
          <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
            <p className="dense-label">Document credits remaining</p>
            <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{billingTotals.docRemaining > 99999 ? "∞" : billingTotals.docRemaining}</p>
          </div>
          <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
            <p className="dense-label">Consultant credits used</p>
            <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{billingTotals.consultantUsed}</p>
          </div>
          <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
            <p className="dense-label">Consultant credits remaining</p>
            <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{billingTotals.consultantRemaining > 99999 ? "∞" : billingTotals.consultantRemaining}</p>
          </div>
        </div>
      </section>

      <section id="portfolio-overview" className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {projects.length ? projects.map((project) => (
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
                    {projectStatuses[project.status ?? "active"]}
                  </Badge>
                </div>
              </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-[var(--color-text-secondary)]">
                <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
                  <p className="dense-label">Role</p>
                  <p className="mt-1">{roleLabels[project.role]}</p>
                </div>
                <div className="rounded-lg bg-[var(--color-surface-2)] p-3 text-xs text-[var(--color-text-secondary)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="dense-label">Plan & usage</p>
                    <Badge className="border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
                      {project.planName ?? "Starter"}
                    </Badge>
                  </div>
                  <p className="mt-2">
                    Documents: <span className="mono">{project.documentCreditsUsed ?? 0}</span> /{" "}
                    <span className="mono">{(project.documentCreditsUsed ?? 0) + (project.documentCreditsRemaining ?? 0) > 99999 ? "∞" : (project.documentCreditsUsed ?? 0) + (project.documentCreditsRemaining ?? 0)}</span>
                  </p>
                  <p className="mt-1">
                    Consultant sessions: <span className="mono">{project.consultantCreditsUsed ?? 0}</span> /{" "}
                    <span className="mono">{(project.consultantCreditsUsed ?? 0) + (project.consultantCreditsRemaining ?? 0) > 99999 ? "∞" : (project.consultantCreditsUsed ?? 0) + (project.consultantCreditsRemaining ?? 0)}</span>
                  </p>
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
                  <p className="dense-label">Project Code</p>
                  <p className="mono mt-1 font-bold text-[var(--color-green)]">{project.projectCode}</p>
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
                  <Link href={`/projects/${project.id}`}>Open Project</Link>
                </Button>
                <Button asChild variant="secondary" className="rounded-md px-3 text-[12px]">
                  <Link href={`/projects/${project.id}/submission`}>Submission pack</Link>
                </Button>
                <Button asChild variant="secondary" className="rounded-md px-3 text-[12px]">
                  <Link href={`/documents?project=${project.id}`}>Documents</Link>
                </Button>
                <form action={leaveProjectAction} className="ml-auto">
                  <input type="hidden" name="projectId" value={project.id} />
                  <Button type="submit" variant="ghost" className="h-[32px] rounded-md px-3 text-xs text-[var(--color-red)] hover:bg-[var(--color-red-soft)] hover:text-[var(--color-red)]">
                    Leave project
                  </Button>
                </form>
              </div>

              {canManageProject(project.role) ? (
                <details className="mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] overflow-hidden group">
                  <summary className="flex cursor-pointer select-none items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-all">
                    <span>Project Settings & Controls</span>
                    <span className="text-xs text-[var(--color-text-tertiary)] font-normal group-open:hidden">Expand Setup</span>
                    <span className="text-xs text-[var(--color-text-tertiary)] font-normal hidden group-open:inline">Collapse</span>
                  </summary>
                  <div className="border-t border-[var(--color-border)] p-3 space-y-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[12px] font-medium text-[var(--color-text-primary)]">Project controls</p>
                        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
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
                    {["project_admin", "super_user", "super_admin", "L3", "L5"].includes(project.role) ? (
                      <section className="mt-3 grid gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                        <p className="text-[12px] font-medium text-[var(--color-text-primary)]">Manual upload & instantiation</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          Upload IGBC project manual (PDF), then import tracker sheet (XLSX) to seed credit-level mapping.
                        </p>
                        <form action={uploadProjectGuidebookAction} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                          <input type="hidden" name="project_id" value={project.id} />
                          <input
                            name="guidebook"
                            type="file"
                            accept=".pdf,application/pdf"
                            required
                            className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[12px] text-[var(--color-text-primary)]"
                          />
                          <Button type="submit" variant="secondary" className="h-[34px] rounded-md px-3 text-[12px]">
                            Upload Project Manual
                          </Button>
                        </form>
                        <form action={importProjectTrackerBaselineAction} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                          <input type="hidden" name="project_id" value={project.id} />
                          <input
                            name="tracker_file"
                            type="file"
                            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                            required
                            className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[12px] text-[var(--color-text-primary)]"
                          />
                          <Button type="submit" variant="secondary" className="h-[34px] rounded-md px-3 text-[12px]">
                            Import Tracker Baseline
                          </Button>
                        </form>
                      </section>
                    ) : null}
                    {canEditPlan ? (
                      <form action={updateProjectPlanSettingsAction} className="mt-3 grid gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                        <input type="hidden" name="project_id" value={project.id} />
                        <p className="text-[12px] font-medium text-[var(--color-text-primary)]">Plan controls</p>
                        <div className="grid gap-2 md:grid-cols-2">
                          <select
                            name="plan_code"
                            defaultValue={project.planCode ?? "starter"}
                            className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
                          >
                            {plans.map((plan) => (
                              <option key={plan.code} value={plan.code}>
                                {plan.name}
                              </option>
                            ))}
                          </select>
                          <Input
                            name="document_credit_limit"
                            type="number"
                            min={0}
                            max={999999}
                            defaultValue={project.documentCreditLimit ?? 0}
                            placeholder="Document credits"
                          />
                          <Input
                            name="consultant_credit_limit"
                            type="number"
                            min={0}
                            max={999999}
                            defaultValue={project.consultantCreditLimit ?? 0}
                            placeholder="Consultant credits"
                          />
                          <Input
                            name="topup_document_credits"
                            type="number"
                            min={0}
                            max={999999}
                            defaultValue={Math.max((project.documentCreditsUsed ?? 0) + (project.documentCreditsRemaining ?? 0) - (project.documentCreditLimit ?? 0), 0)}
                            placeholder="Doc top-up"
                          />
                          <Input
                            name="topup_consultant_credits"
                            type="number"
                            min={0}
                            max={999999}
                            defaultValue={Math.max((project.consultantCreditsUsed ?? 0) + (project.consultantCreditsRemaining ?? 0) - (project.consultantCreditLimit ?? 0), 0)}
                            placeholder="Consultant top-up"
                          />
                        </div>
                        <Button type="submit" variant="secondary" className="rounded-md px-3 text-[12px]">
                          Save plan
                        </Button>
                      </form>
                    ) : (
                      <section className="mt-3 grid gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                        <p className="text-[12px] font-medium text-[var(--color-text-primary)]">Plan controls</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">View-only for your role.</p>
                        <div className="grid gap-2 md:grid-cols-2 text-xs text-[var(--color-text-secondary)]">
                          <p>Plan: <span className="mono">{project.planName ?? "Starter"}</span></p>
                          <p>Doc limit: <span className="mono">{project.documentCreditLimit ?? 0}</span></p>
                          <p>Consultant limit: <span className="mono">{project.consultantCreditLimit ?? 0}</span></p>
                          <p>Doc top-up: <span className="mono">{Math.max((project.documentCreditsUsed ?? 0) + (project.documentCreditsRemaining ?? 0) - (project.documentCreditLimit ?? 0), 0)}</span></p>
                        </div>
                      </section>
                    )}
                    {canManageTokenControls ? (
                      <>
                        <form action={logConsultantSessionAction} className="mt-2 grid gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                          <input type="hidden" name="project_id" value={project.id} />
                          <p className="text-[12px] font-medium text-[var(--color-text-primary)]">Consultant session logger</p>
                          <div className="grid gap-2 md:grid-cols-[170px_120px_minmax(0,1fr)]">
                            <select
                              name="source"
                              defaultValue="manual"
                              className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
                            >
                              <option value="manual">Manual</option>
                              <option value="review_call">Review call</option>
                              <option value="site_visit">Site visit</option>
                              <option value="harita_help">Harita help</option>
                            </select>
                            <Input name="credits_burned" type="number" min={1} defaultValue={1} />
                            <Input name="notes" placeholder="Session context (optional)" />
                          </div>
                          <Button type="submit" variant="secondary" className="rounded-md px-3 text-[12px]">
                            Log session
                          </Button>
                        </form>
                        <form action={createProjectTopupInvoiceAction} className="mt-2 grid gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                          <input type="hidden" name="project_id" value={project.id} />
                          <p className="text-[12px] font-medium text-[var(--color-text-primary)]">Billing & invoice</p>
                          <div className="grid gap-2 md:grid-cols-3">
                            <Input name="document_credits" type="number" min={0} defaultValue={0} placeholder="Doc credits" />
                            <Input name="consultant_credits" type="number" min={0} defaultValue={0} placeholder="Consultant credits" />
                            <Input name="amount_inr" type="number" min={0} step="0.01" defaultValue={0} placeholder="Amount (INR)" />
                          </div>
                          <Input name="notes" placeholder="Billing note / PO reference" />
                          <Button type="submit" variant="secondary" className="rounded-md px-3 text-[12px]">
                            Create top-up invoice
                          </Button>
                        </form>
                      </>
                    ) : null}
                  </div>
                </details>
              ) : (
                <details className="mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] overflow-hidden group">
                  <summary className="flex cursor-pointer select-none items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-all">
                    <span>Project Plan Details</span>
                    <span className="text-xs text-[var(--color-text-tertiary)] font-normal group-open:hidden">Expand Details</span>
                    <span className="text-xs text-[var(--color-text-tertiary)] font-normal hidden group-open:inline">Collapse</span>
                  </summary>
                  <div className="border-t border-[var(--color-border)] p-3 space-y-2 text-xs text-[var(--color-text-secondary)]">
                    <p>Plan: <span className="mono">{project.planName ?? "Starter"}</span></p>
                    <p>Doc limit: <span className="mono">{project.documentCreditLimit ?? 0}</span></p>
                    <p>Consultant limit: <span className="mono">{project.consultantCreditLimit ?? 0}</span></p>
                    <p>Doc top-up: <span className="mono">{Math.max((project.documentCreditsUsed ?? 0) + (project.documentCreditsRemaining ?? 0) - (project.documentCreditLimit ?? 0), 0)}</span></p>
                  </div>
                </details>
              )}
            </div>
          </article>
        )) : (
          <article className="surface-card p-6 lg:col-span-2 2xl:col-span-3">
            <h3 className="text-[14px] font-medium text-[var(--color-text-primary)]">No projects assigned</h3>
            <p className="mt-2 text-[12px] text-[var(--color-text-secondary)]">
              {canCreateProject
                ? "Create your first project above to initialize the workspace."
                : "You are signed in, but no projects are assigned to your role yet."}
            </p>
          </article>
        )}
      </section>
        </>
      )}
    </Shell>
  );
}
