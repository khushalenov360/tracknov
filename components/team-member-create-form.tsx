"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  createTeamMemberAction,
  type TeamMemberActionState,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { roleLabels } from "@/lib/constants";
import type { MemberRole } from "@/lib/types";

type Props = {
  allowedRoles: MemberRole[];
  projects: { id: string; name: string }[];
  canCreateSystemProfiles: boolean;
  canCreateProjectAdmins: boolean;
};

const initialTeamMemberActionState: TeamMemberActionState = {
  status: "idle",
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="h-[34px] rounded-md px-4" disabled={pending}>
      {pending ? "Adding..." : "Add"}
    </Button>
  );
}

function statusTone(state: TeamMemberActionState) {
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
  projects,
  canCreateSystemProfiles,
  canCreateProjectAdmins,
}: Props) {
  const [state, formAction] = useFormState(createTeamMemberAction, initialTeamMemberActionState);

  return (
    <form action={formAction} className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px_180px_180px_auto]">
      <Input
        name="full_name"
        placeholder={canCreateSystemProfiles ? "Login name" : canCreateProjectAdmins ? "Project Admin login name" : "Login name"}
        required
      />
      <Input name="email" type="email" placeholder="Email contact (email@company.com)" required />
      <Input name="company" placeholder="Company" />
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
      <select
        name="project_id"
        defaultValue={projects[0]?.id ?? ""}
        className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
      >
        {canCreateSystemProfiles ? <option value="">No project</option> : null}
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] xl:col-span-1">
        <Input name="password" type="password" placeholder="Temporary password" required />
        <SubmitButton />
      </div>
      {state.message ? (
        <p className={`xl:col-span-6 text-[11px] ${statusTone(state)}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
