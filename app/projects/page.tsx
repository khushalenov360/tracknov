import Link from "next/link";
import {
  createProjectTopupInvoiceAction,
  createProjectAction,
  deleteProjectAction,
  logConsultantSessionAction,
  updateProjectAction,
  updateProjectPlanSettingsAction,
} from "@/app/actions";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { igbcRatingSystemGroups, projectStatuses, projectTypes, roleLabels } from "@/lib/constants";
import { getActiveSubscriptionPlans, getCurrentUser, getDashboardProjects } from "@/lib/data";
import { canCreateProjects, canDeleteProjects, canManageProject } from "@/lib/rbac";
import { pct } from "@/lib/utils";

export default async function ProjectsPage() {
  const [user, projects, plans] = await Promise.all([getCurrentUser(), getDashboardProjects(), getActiveSubscriptionPlans()]);
  const canCreateProject = canCreateProjects(user?.role);
  const canDeleteAnyProject = canDeleteProjects(user?.role);
  const activeRole = user?.role ?? projects[0]?.role ?? "consultant";
  const isL3OrAbove = ["project_admin", "super_admin", "super_user"].includes(activeRole);
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
      description="Combined Tracknov and ENOVAIT project portfolio with certification targets, team counts, documents, and tracker progress."
      role={activeRole}
      notificationCount={projects.reduce((sum, project) => sum + project.openRemarks, 0)}
    >
      {isL3OrAbove ? (
        <section className="surface-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[13px] font-medium text-[var(--color-text-primary)]">Project Admin command view</h2>
              <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                Cross-project validation queue, readiness, and priority signals.
              </p>
            </div>
            <Button asChild className="h-[32px] rounded-md px-3 text-[12px]">
              <Link href="/review-queue">Open validation queue</Link>
            </Button>
          </div>
          <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="min-w-full border-collapse text-[12px]">
              <thead className="bg-[var(--color-surface-2)]">
                <tr className="border-b border-[var(--color-border)]">
                  {["Project", "Progress", "Pending Validation", "Rejections", "Submission Readiness"].map((heading) => (
                    <th key={heading} className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const pendingValidation = Number(project.pendingReviewsCount ?? 0);
                  const rejections = Number(project.rejectedCount ?? 0);
                  const ready = pendingValidation === 0 && rejections === 0 && project.overallCompletion >= 95;
                  return (
                    <tr key={project.id} className="border-b border-[var(--color-border)]">
                      <td className="px-3 py-2">
                        <Link href={`/projects/${project.id}`} className="text-[var(--color-green)] hover:text-[var(--color-green-dim)]">
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{pct(project.overallCompletion)}</td>
                      <td className="px-3 py-2">{pendingValidation}</td>
                      <td className="px-3 py-2">{rejections}</td>
                      <td className="px-3 py-2">
                        <Badge
                          className={
                            ready
                              ? "border border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[var(--color-green)]"
                              : "border border-[var(--color-amber)] bg-[var(--color-amber-soft)] text-[var(--color-amber)]"
                          }
                        >
                          {ready ? "Ready for submission" : "Validation pending"}
                        </Badge>
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

      <section className="mt-4 surface-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[13px] font-medium text-[var(--color-text-primary)]">Billing credits overview</h2>
            <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
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
            <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{billingTotals.docRemaining}</p>
          </div>
          <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
            <p className="dense-label">Consultant credits used</p>
            <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{billingTotals.consultantUsed}</p>
          </div>
          <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
            <p className="dense-label">Consultant credits remaining</p>
            <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{billingTotals.consultantRemaining}</p>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
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
                    {projectStatuses[project.status]}
                  </Badge>
                </div>
              </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--color-text-secondary)]">
                <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
                  <p className="dense-label">Role</p>
                  <p className="mt-1">{roleLabels[project.role]}</p>
                </div>
                <div className="rounded-lg bg-[var(--color-surface-2)] p-3 text-[11px] text-[var(--color-text-secondary)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="dense-label">Plan & usage</p>
                    <Badge className="border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
                      {project.planName ?? "Starter"}
                    </Badge>
                  </div>
                  <p className="mt-2">
                    Documents: <span className="mono">{project.documentCreditsUsed ?? 0}</span> /{" "}
                    <span className="mono">{(project.documentCreditsUsed ?? 0) + (project.documentCreditsRemaining ?? 0)}</span>
                  </p>
                  <p className="mt-1">
                    Consultant sessions: <span className="mono">{project.consultantCreditsUsed ?? 0}</span> /{" "}
                    <span className="mono">{(project.consultantCreditsUsed ?? 0) + (project.consultantCreditsRemaining ?? 0)}</span>
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
                        defaultValue={project.documentCreditLimit ?? 0}
                        placeholder="Document credits"
                      />
                      <Input
                        name="consultant_credit_limit"
                        type="number"
                        min={0}
                        defaultValue={project.consultantCreditLimit ?? 0}
                        placeholder="Consultant credits"
                      />
                      <Input
                        name="topup_document_credits"
                        type="number"
                        min={0}
                        defaultValue={Math.max((project.documentCreditsUsed ?? 0) + (project.documentCreditsRemaining ?? 0) - (project.documentCreditLimit ?? 0), 0)}
                        placeholder="Doc top-up"
                      />
                      <Input
                        name="topup_consultant_credits"
                        type="number"
                        min={0}
                        defaultValue={Math.max((project.consultantCreditsUsed ?? 0) + (project.consultantCreditsRemaining ?? 0) - (project.consultantCreditLimit ?? 0), 0)}
                        placeholder="Consultant top-up"
                      />
                    </div>
                    <Button type="submit" variant="secondary" className="rounded-md px-3 text-[12px]">
                      Save plan
                    </Button>
                  </form>
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
                        <option value="copilot_help">Copilot help</option>
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
                </section>
              ) : null}
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
    </Shell>
  );
}
