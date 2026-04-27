import { redirect } from "next/navigation";
import { createProjectAction } from "@/app/actions";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser, getDashboardProjects } from "@/lib/data";

export default async function WelcomePage() {
  const [user, projects] = await Promise.all([getCurrentUser(), getDashboardProjects()]);

  if (!user) {
    redirect("/login");
  }

  if (projects.length > 0) {
    redirect("/dashboard");
  }

  return (
    <Shell
      title="Create your first workspace"
      description={`Signed in as ${user.email ?? "unknown user"}. Create the first workspace to claim this account and start the team setup.`}
      role="consultant"
      notificationCount={0}
    >
      <section className="surface-card p-5">
        <div className="max-w-[720px]">
          <p className="dense-label">Workspace bootstrap</p>
          <h1 className="mt-2 text-[20px] font-medium text-[var(--color-text-primary)]">Create the first workspace.</h1>
          <p className="mt-2 text-[13px] leading-6 text-[var(--color-text-secondary)]">
            This first workspace makes you the owner. After that, you can invite teammates and keep the project set under one account.
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
        </form>

        <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-[var(--color-text-tertiary)]">
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1">
            Email and password sign-in
          </span>
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1">
            First user becomes owner
          </span>
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1">
            Invite-only later
          </span>
        </div>
      </section>
    </Shell>
  );
}
