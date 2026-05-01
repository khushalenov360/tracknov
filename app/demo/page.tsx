import Link from "next/link";
import { cookies } from "next/headers";
import { setDemoModeAction } from "@/app/actions";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser, getDashboardProjects } from "@/lib/data";
import { env } from "@/lib/env";
import { getDemoDatasetSummary, getDemoWalkthrough } from "@/lib/services/demo-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DemoPage() {
  const [user, projects] = await Promise.all([getCurrentUser(), getDashboardProjects()]);
  const canControlDemo = user?.email?.toLowerCase() === "demo@enov360.com";
  const cookieStore = cookies();
  const demoOn = cookieStore.get("tracknov_demo_mode")?.value === "1";
  const steps = getDemoWalkthrough();
  const summary = getDemoDatasetSummary();

  if (!canControlDemo) {
    return (
      <Shell
        title="Demo Mode"
        description="Guided walkthrough workspace."
        role={user?.role ?? "consultant"}
        email={user?.email}
        notificationCount={projects.reduce((sum, project) => sum + project.openRemarks, 0)}
      >
        <section className="surface-card p-4">
          <p className="text-[12px] text-[var(--color-text-secondary)]">
            Demo mode is restricted to platform control roles and requires `DEMO_MODE_ENABLED=true`.
          </p>
        </section>
      </Shell>
    );
  }

  return (
    <Shell
      title="Demo Mode"
      description="Sandbox walkthrough for sales demos and onboarding."
      role={user?.role ?? "consultant"}
      email={user?.email}
      notificationCount={projects.reduce((sum, project) => sum + project.openRemarks, 0)}
    >
      <section className="surface-card p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[13px] font-medium text-[var(--color-text-primary)]">Guided demo walkthrough</h2>
            <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
              Isolated training flow for upload, review, and executive insight demo.
            </p>
          </div>
          <Badge className="border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
            {demoOn ? "Demo mode ON" : "Demo mode OFF"}
          </Badge>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            ["Projects", summary.projects],
            ["Credits", summary.credits],
            ["Documents", summary.documents],
            ["Pending review", summary.pendingReviews],
            ["Rejected", summary.rejected],
            ["Token balance", summary.tokenBalance],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <p className="dense-label">{label}</p>
              <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <form action={setDemoModeAction}>
            <input type="hidden" name="enabled" value={demoOn ? "false" : "true"} />
            <Button type="submit" className="h-[32px] rounded-md px-3 text-[12px]">
              {demoOn ? "Exit demo mode" : "Enter demo mode"}
            </Button>
          </form>
          <form action={setDemoModeAction}>
            <input type="hidden" name="enabled" value="true" />
            <Button type="submit" variant="secondary" className="h-[32px] rounded-md px-3 text-[12px]">
              Reset walkthrough
            </Button>
          </form>
        </div>
      </section>

      <section className="mt-4 surface-card p-4">
        <h2 className="text-[13px] font-medium text-[var(--color-text-primary)]">Walkthrough steps</h2>
        <div className="mt-3 grid gap-2">
          {steps.map((step) => (
            <div key={step.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <p className="text-[12px] font-medium text-[var(--color-text-primary)]">{step.title}</p>
              <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{step.instruction}</p>
              <Link href={step.target} className="mt-2 inline-block text-[11px] text-[var(--color-green)] hover:text-[var(--color-green-dim)]">
                Open {step.target}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
