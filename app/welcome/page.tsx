import Link from "next/link";
import { redirect } from "next/navigation";
import { createProjectAction, updateOnboardingChecklistAction } from "@/app/actions";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui-lib/ui/badge";
import { Button } from "@/components/ui-lib/ui/button";
import { Input } from "@/components/ui-lib/ui/input";
import { getCurrentUser, getDashboardProjects, getOrCreateOnboardingChecklist } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const [user, projects] = await Promise.all([getCurrentUser(), getDashboardProjects()]);

  if (!user) {
    redirect("/login");
  }

  const primaryProjectId = projects[0]?.id ?? null;
  const onboarding = primaryProjectId ? await getOrCreateOnboardingChecklist(primaryProjectId) : null;
  const checklist = onboarding?.checklist ?? null;
  const done = checklist ? Object.values(checklist).filter(Boolean).length : 0;

  return (
    <Shell
      title="Workspace onboarding"
      description={`Signed in as ${user.email ?? "unknown user"}. Complete onboarding once and use it as your project-start template.`}
      role={user.role}
      notificationCount={0}
    >
      {!projects.length ? (
        <section className="surface-card p-5">
          <div className="max-w-[720px]">
            <p className="dense-label">Workspace bootstrap</p>
            <h1 className="mt-2 text-[20px] font-medium text-[var(--color-text-primary)]">Create the first workspace.</h1>
            <p className="mt-2 text-[13px] leading-6 text-[var(--color-text-secondary)]">
              This first workspace initializes project controls, team hierarchy, and document workflows.
            </p>
          </div>

          <form action={createProjectAction} className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_auto]">
            <Input name="name" placeholder="Workspace name" required />
            <select
              name="target_rating"
              className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
              defaultValue="Gold"
            >
              {["Certified", "Silver", "Gold", "Platinum"].map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
            <Button type="submit" className="h-[34px] rounded-md px-4">
              Create workspace
            </Button>
            <input type="hidden" name="client" value="Default Client" />
            <input type="hidden" name="location" value="India" />
            <input type="hidden" name="rating_system" value="IGBC Green Interiors" />
            <input type="hidden" name="project_type" value="commercial" />
            <input type="hidden" name="status" value="active" />
            <input type="hidden" name="green_certification" value="IGBC" />
            <input type="hidden" name="igbc_variant" value="new" />
          </form>
        </section>
      ) : (
        <section className="surface-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="dense-label">Project start checklist</p>
              <h2 className="mt-2 text-[16px] font-medium text-[var(--color-text-primary)]">Onboarding for {projects[0].name}</h2>
              <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
                {done}/4 steps completed.
              </p>
            </div>
            <Badge className="border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
              {done === 4 ? "Ready" : "In progress"}
            </Badge>
          </div>

          {primaryProjectId && checklist ? (
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {[
                ["profile_completed", "Profile details confirmed"],
                ["project_scope_confirmed", "Project scope confirmed"],
                ["first_document_uploaded", "First document uploaded"],
                ["first_review_completed", "First review completed"],
              ].map(([key, label]) => {
                const checked = Boolean((checklist as any)[key]);
                return (
                  <form
                    key={key}
                    action={updateOnboardingChecklistAction}
                    className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2"
                  >
                    <input type="hidden" name="project_id" value={primaryProjectId} />
                    <input type="hidden" name="key" value={key} />
                    <input type="hidden" name="value" value={checked ? "false" : "true"} />
                    <span className="text-[12px] text-[var(--color-text-primary)]">{label}</span>
                    <Button type="submit" variant={checked ? "secondary" : "default"} className="h-[28px] rounded-md px-2.5 text-xs">
                      {checked ? "Done" : "Mark done"}
                    </Button>
                  </form>
                );
              })}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="secondary" className="rounded-md px-3 text-[12px]">
              <Link href={`/projects/${projects[0].id}`}>Open workspace</Link>
            </Button>
            <Button asChild variant="secondary" className="rounded-md px-3 text-[12px]">
              <Link href={`/documents?project=${projects[0].id}`}>Open documents</Link>
            </Button>
          </div>
        </section>
      )}
    </Shell>
  );
}
