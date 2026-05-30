import { getProjectWorkspace } from "@/lib/data";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { roleLabels } from "@/lib/constants";
import { formatDateTimeIST } from "@/lib/utils";
import { ProjectTeamInviteForm } from "@/components/project/ProjectTeamInviteForm";
import type { MemberRole } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const workspace = await getProjectWorkspace(projectId);

  if (!workspace) {
    redirect("/dashboard");
  }

  const { members, userRole } = workspace;
  const canInvite = ["project_admin", "super_admin", "super_user", "L3", "L5"].includes(userRole);

  const roleTone: Record<string, string> = {
    super_user: "border border-[#0b1f33] bg-[#0b1f33] text-white",
    super_admin: "border border-[var(--color-text-primary)] bg-[var(--color-text-primary)] text-white",
    project_admin: "border border-[var(--color-green)] bg-[var(--color-green)] text-white",
    consultant: "border border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[var(--color-green)]",
    architect: "border border-[var(--color-blue-light)] bg-[var(--color-blue-light)] text-[var(--color-blue)]",
    mep: "border border-[var(--color-purple-light)] bg-[var(--color-purple-light)] text-[var(--color-purple)]",
    contractor: "border border-[var(--color-amber-light)] bg-[var(--color-amber-light)] text-[var(--color-amber)]",
    client: "border border-[var(--color-olive-light)] bg-[var(--color-olive-light)] text-[var(--color-olive)]",
    owner: "border border-[var(--color-olive-light)] bg-[var(--color-olive-light)] text-[var(--color-olive)]",
  };

  const allowedRoles = ["project_admin", "super_admin", "super_user", "L3", "L5"].includes(userRole)
    ? (["consultant", "client", "owner", "architect", "mep", "contractor"] as MemberRole[])
    : [];

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">Project Team</h2>
        <p className="text-[12px] text-[var(--color-text-secondary)] mt-1">
          People assigned to this project and their roles.
        </p>
      </div>

      {canInvite && allowedRoles.length > 0 && (
        <div className="mb-6">
          <ProjectTeamInviteForm projectId={projectId} allowedRoles={allowedRoles} />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-[12px]">
            <thead className="bg-[var(--color-surface-2)]">
              <tr className="border-b border-[var(--color-border)]">
                {["Name / Email", "Role"].map((heading) => (
                  <th key={heading} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.length ? members.map((member) => (
                <tr key={member.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-blue-light)] text-[11px] font-medium text-[var(--color-blue)]">
                        {member.full_name
                          ? member.full_name.split(" ").map((part: string) => part[0]).join("").slice(0, 2).toUpperCase()
                          : "U"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
                          {member.full_name || "Unnamed User"}
                        </p>
                        <p className="truncate text-[12px] text-[var(--color-text-secondary)]">
                          {member.member_email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={roleTone[member.role] || "border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]"}>
                      {roleLabels[member.role] || member.role}
                    </Badge>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={2} className="px-4 py-10 text-center text-[12px] text-[var(--color-text-tertiary)]">
                    No members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
