"use client";

import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { createProjectInviteAction, type InviteActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { roleLabels } from "@/lib/constants";
import type { MemberRole } from "@/lib/types";

const initialState: InviteActionState = {
  status: "idle",
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-[34px] rounded-md px-4" disabled={pending}>
      {pending ? "Generating..." : "Generate Invite Link"}
    </Button>
  );
}

export function ProjectTeamInviteForm({
  projectId,
  allowedRoles,
}: {
  projectId: string;
  allowedRoles: MemberRole[];
}) {
  const [state, formAction] = useActionState(createProjectInviteAction, initialState);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
      <h3 className="text-[13px] font-medium text-[var(--color-text-primary)] mb-1">Invite New Member</h3>
      <p className="text-xs text-[var(--color-text-secondary)] mb-4">
        Generate a secure invite link to send to a new team member.
      </p>

      <form action={formAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
        <input type="hidden" name="project_id" value={projectId} />
        
        <Input name="email" type="email" placeholder="Email address" required />
        
        <select
          name="role"
          defaultValue={allowedRoles[0]}
          className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
        >
          {allowedRoles.map((role) => (
            <option key={role} value={role}>
              {roleLabels[role]}
            </option>
          ))}
        </select>
        
        <SubmitButton />
      </form>

      {state.message && (
        <div className={`mt-3 text-xs ${state.status === "success" ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}`}>
          {state.message}
        </div>
      )}

      {state.token && (
        <div className="mt-3 rounded border border-[var(--color-green-light)] bg-[#e6f4ea] p-3 text-[12px]">
          <p className="font-medium text-[var(--color-green)] mb-1">Invite generated successfully!</p>
          <p className="text-[var(--color-text-primary)]">Copy this link and send it to the user:</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 overflow-auto rounded bg-white px-2 py-1.5 text-[11px] border border-[var(--color-border)]">
              {typeof window !== "undefined" ? window.location.origin : ""}/invite/{state.token}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
