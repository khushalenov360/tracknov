"use client";

import { useFormStatus } from "react-dom";
import { useActionState, useState, useEffect } from "react";
import {
  createPlatformInviteAction,
  type PlatformInviteActionState,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { roleLabels } from "@/lib/constants";
import type { MemberRole } from "@/lib/types";
import { Check, Copy } from "lucide-react";

type Props = {
  allowedRoles: MemberRole[];
};

const initialState: PlatformInviteActionState = {
  status: "idle",
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Generating..." : "Generate Invite Link"}
    </Button>
  );
}

function statusTone(state: PlatformInviteActionState) {
  if (state.status === "success") {
    return "text-[var(--color-green)]";
  }
  if (state.status === "error") {
    return "text-[var(--color-red)]";
  }
  return "text-[var(--color-text-secondary)]";
}

export function TeamMemberCreateForm({
  allowedRoles,
}: Props) {
  const [state, formAction] = useActionState(createPlatformInviteAction, initialState);
  const [copied, setCopied] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");

  useEffect(() => {
    if (state.status === "success" && state.token) {
      setInviteUrl(`${window.location.origin}/register/${state.token}`);
    }
  }, [state]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <h3 className="mb-2 text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">
        Invite New Member
      </h3>
      <p className="mb-6 text-sm text-[var(--color-text-secondary)]">
        Generate a secure invite link to send to a new team member.
      </p>

      <form action={formAction} className="flex gap-3">
        <Input 
          name="email" 
          type="email" 
          placeholder="Email address" 
          required 
          className="flex-1"
        />
        <select
          name="role"
          defaultValue={allowedRoles[0]}
          className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
        >
          {allowedRoles.map((role) => (
            <option key={role} value={role}>
              {roleLabels[role] || role}
            </option>
          ))}
        </select>
        <SubmitButton />
      </form>

      {state.message && !inviteUrl && (
        <p className={`mt-4 text-xs ${statusTone(state)}`}>{state.message}</p>
      )}

      {inviteUrl && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-slate-50 p-3">
          <div className="flex-1 truncate text-sm font-medium text-slate-600">
            {inviteUrl}
          </div>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={copyToClipboard}
            className="shrink-0 gap-2 h-8"
          >
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy Link"}
          </Button>
        </div>
      )}
    </div>
  );
}
