import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptProjectInviteAction } from "@/app/actions";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: { token: string };
};

export default async function InvitePage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=/invite/${params.token}`);
  }

  const client = createClient();
  const { data: invite } = await client
    .from("project_invites")
    .select("id, project_id, email, role, token, accepted_at, created_at")
    .eq("token", params.token)
    .single();

  if (!invite) {
    redirect("/login");
  }

  const emailMatches = (user.email ?? "").toLowerCase() === invite.email.toLowerCase();

  return (
    <Shell
      title="Accept invite"
      description={
        emailMatches
          ? `You were invited as ${invite.role} for this workspace. Accept the invite to join.`
          : `This invite was sent to ${invite.email}, but you are signed in as ${user.email ?? "unknown user"}.`
      }
      role="consultant"
      notificationCount={0}
    >
      <section className="surface-card p-5">
        <div className="max-w-[680px] space-y-3">
          <p className="dense-label">Workspace invitation</p>
          <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
            {invite.accepted_at ? "This invite was already accepted." : "Join the workspace."}
          </h1>
          <p className="text-[13px] leading-6 text-[var(--color-text-secondary)]">
            {emailMatches
              ? "If this is the right email, accept the invite below and you will be added to the workspace."
              : "Sign out and use the invited email address before accepting this invite."}
          </p>
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-[12px] text-[var(--color-text-secondary)] md:grid-cols-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">Invite email</p>
            <p className="mt-1 font-medium text-[var(--color-text-primary)]">{invite.email}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">Role</p>
            <p className="mt-1 font-medium text-[var(--color-text-primary)]">{invite.role}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">Status</p>
            <p className="mt-1 font-medium text-[var(--color-text-primary)]">
              {invite.accepted_at ? "Accepted" : "Pending"}
            </p>
          </div>
        </div>

        {invite.accepted_at ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild className="h-9 rounded-full px-5 text-[12px]">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
            <Button asChild variant="secondary" className="h-9 rounded-full px-5 text-[12px]">
              <Link href={`/projects/${invite.project_id}`}>Open project</Link>
            </Button>
          </div>
        ) : emailMatches ? (
          <form action={acceptProjectInviteAction} className="mt-5">
            <input type="hidden" name="token" value={invite.token} />
            <Button type="submit" className="h-9 rounded-full px-5 text-[12px]">
              Accept invite
            </Button>
          </form>
        ) : null}
      </section>
    </Shell>
  );
}
