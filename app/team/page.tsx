import { Shell } from "@/components/shell";
import { TeamMemberCreateForm } from "@/components/team-member-create-form";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser, getDashboardProjects, getTeamMembers } from "@/lib/data";
import { roleLabels } from "@/lib/constants";
import { canManageTeamFromRole } from "@/lib/rbac";
import { formatDateTimeIST } from "@/lib/utils";

const roleTone = {
  super_user: "border border-[#0b1f33] bg-[#0b1f33] text-white",
  super_admin: "border border-[var(--color-text-primary)] bg-[var(--color-text-primary)] text-white",
  project_admin: "border border-[var(--color-green)] bg-[var(--color-green)] text-white",
  consultant: "border border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[var(--color-green)]",
  architect: "border border-[var(--color-blue-light)] bg-[var(--color-blue-light)] text-[var(--color-blue)]",
  mep: "border border-[var(--color-purple-light)] bg-[var(--color-purple-light)] text-[var(--color-purple)]",
  contractor: "border border-[var(--color-amber-light)] bg-[var(--color-amber-light)] text-[var(--color-amber)]",
  client: "border border-[var(--color-olive-light)] bg-[var(--color-olive-light)] text-[var(--color-olive)]",
  owner: "border border-[var(--color-olive-light)] bg-[var(--color-olive-light)] text-[var(--color-olive)]",
} as const;

export default async function TeamPage() {
  const [currentUser, projects, members] = await Promise.all([getCurrentUser(), getDashboardProjects(), getTeamMembers()]);
  const activeRole = currentUser?.role ?? projects[0]?.role ?? "consultant";
  const canCreateSystemProfiles = activeRole === "super_user";
  const canCreatePlatformProfiles = activeRole === "super_admin";
  const canCreateProjectMembers = activeRole === "project_admin";
  const canCreateClientProfiles = activeRole === "client";
  const canCreateOwnerProfiles = activeRole === "owner";
  const allowedRoles = canCreateSystemProfiles
    ? (["super_admin", "project_admin", "client", "owner", "consultant", "architect", "mep", "contractor"] as const)
    : canCreatePlatformProfiles
      ? (["client", "owner", "consultant", "architect", "mep", "contractor"] as const)
      : canCreateProjectMembers
        ? (["client", "owner", "consultant"] as const)
        : canCreateClientProfiles
          ? (["owner"] as const)
          : canCreateOwnerProfiles
            ? (["architect", "mep", "contractor"] as const)
        : [];
  const teamDescription = canCreateSystemProfiles
    ? "Super User is the apex role with full control over platform, project, and client-side hierarchy."
    : canCreatePlatformProfiles
      ? "Super Admin provisions project-side and client-side roles under Super User governance."
      : canCreateProjectMembers
        ? "Project Admin manages assigned project coordination roles, including Client, Project Owner, and Consultant."
        : canCreateClientProfiles
          ? "Client is the highest position on the client side and can assign the Project Owner."
          : canCreateOwnerProfiles
            ? "Project Owner can assign Architect, MEP Consultant, and Contractor for execution and document collection."
        : "Project team members and assigned roles for the selected workspaces.";

  return (
    <Shell
      title="Team"
      description={teamDescription}
      role={activeRole}
      notificationCount={projects.reduce((sum, project) => sum + project.openRemarks, 0)}
    >
      {canManageTeamFromRole(activeRole) && allowedRoles.length ? (
        <section className="surface-card p-4">
          {canCreateSystemProfiles ? (
            <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
              <p className="text-[12px] font-medium text-[var(--color-text-primary)]">Super User Control Panel</p>
              <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                Create Super Admins, Project Admins, and the full client-side reporting hierarchy.
              </p>
            </div>
          ) : null}
          <TeamMemberCreateForm
            allowedRoles={[...allowedRoles]}
            projects={projects.map((project) => ({ id: project.id, name: project.name }))}
            canCreateSystemProfiles={canCreateSystemProfiles}
            canCreateProjectAdmins={canCreatePlatformProfiles}
          />
        </section>
      ) : null}

      <section className="mt-4 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-[12px]">
            <thead className="bg-[var(--color-surface-2)]">
              <tr className="border-b border-[var(--color-border)]">
                {["Member", "Role", "Company", "Projects", "Joined"].map((heading) => (
                  <th key={heading} className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.length ? members.map((member) => (
                <tr key={member.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)]">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-blue-light)] text-[11px] font-medium text-[var(--color-blue)]">
                        {member.full_name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-[var(--color-text-primary)]">{member.full_name}</p>
                        <p className="text-[11px] text-[var(--color-text-tertiary)]">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge className={roleTone[member.role]}>{roleLabels[member.role]}</Badge>
                  </td>
                  <td className="px-3 py-3 text-[var(--color-text-secondary)]">{member.company || "Not set"}</td>
                  <td className="max-w-[320px] px-3 py-3 text-[var(--color-text-secondary)]">
                    {member.project_names.length ? member.project_names.join(", ") : "No project membership"}
                  </td>
                  <td className="px-3 py-3 text-[var(--color-text-secondary)]">
                    {formatDateTimeIST(member.created_at)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-[12px] text-[var(--color-text-tertiary)]">
                    No team members found for your current workspace scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}
