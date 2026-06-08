import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { registerPlatformUserAction } from "@/app/actions";
import { Button } from "@/components/ui-lib/ui/button";
import { Input } from "@/components/ui-lib/ui/input";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createClient();
  const { data: invite } = await supabase
    .from("platform_invites")
    .select("email, role, accepted_at")
    .eq("token", token)
    .single();

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="surface-card w-full max-w-md p-6 text-center">
          <h1 className="text-lg font-semibold text-[var(--color-red)]">Invalid Invite</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            This invite link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  if (invite.accepted_at) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="surface-card w-full max-w-md p-6 text-center">
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Invite Already Used</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            This invite link has already been used to create an account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] p-4">
      <div className="surface-card w-full max-w-md p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Join Tracknov
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            You have been invited to join the platform. Please complete your profile.
          </p>
        </div>

        <form action={registerPlatformUserAction} className="grid gap-4">
          <input type="hidden" name="token" value={token} />
          
          <div className="grid gap-2">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">Email</label>
            <Input name="email" type="email" value={invite.email} readOnly className="bg-[var(--color-surface-2)]" />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">Full Name</label>
            <Input name="full_name" placeholder="John Doe" required />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">Company (Optional)</label>
            <Input name="company" placeholder="Acme Corp" />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">Password</label>
            <Input name="password" type="password" required />
          </div>

          <Button type="submit" className="mt-4 w-full">
            Complete Registration
          </Button>
        </form>
      </div>
    </div>
  );
}
