import { redirect } from "next/navigation";
import { getProjectWorkspace, getCurrentUser } from "@/lib/data";
import { MatrixAssignmentDropdown } from "@/components/project/MatrixAssignmentDropdown";
import { Badge } from "@/components/ui/badge";
import { canUser } from "@/lib/rbac";
import { AlertCircle } from "lucide-react";

export default async function AssignmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const workspace = await getProjectWorkspace(projectId);
  if (!workspace) redirect("/dashboard");

  const canManage = canUser(workspace.userRole, "MANAGE_TEAM", "TEAM");

  // If user cannot manage team, they shouldn't be here, but we'll show a read-only or empty state
  if (!canManage) {
    return (
      <div className="surface-card p-6 flex items-center gap-3">
        <AlertCircle className="text-[var(--color-yellow)] h-5 w-5" />
        <p className="text-[14px] text-[var(--color-text-secondary)]">You do not have permission to manage assignments.</p>
      </div>
    );
  }

  // Filter out credits that are not applicable
  const activeCredits = workspace.credits.filter(c => c.documents_required?.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-[16px] font-bold text-[var(--color-text-primary)]">Project Assignment Matrix</h2>
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          Rapidly assign responsible team members to individual credit documents without navigating through each workspace.
        </p>
      </div>

      <div className="surface-card rounded-md overflow-hidden border border-[var(--color-border)]">
        <table className="w-full text-left border-collapse text-[12px]">
          <thead>
            <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
              <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)] w-1/3">Credit</th>
              <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)] w-1/3">Required Document</th>
              <th className="px-4 py-3 font-semibold text-[var(--color-text-secondary)] w-1/3">Assigned Contributor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {activeCredits.map((credit) => (
              <>
                {credit.documents_required.map((req: any, idx: number) => (
                  <tr key={`${credit.id}-${req.type}`} className="hover:bg-[var(--color-surface-2)]/50 transition-colors">
                    <td className="px-4 py-3 border-r border-[var(--color-border)]/50">
                      {idx === 0 ? (
                        <div>
                          <p className="font-bold text-[var(--color-text-primary)]">{credit.credit_code}</p>
                          <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">{credit.credit_name}</p>
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 border-r border-[var(--color-border)]/50">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[var(--color-text-primary)]">{req.label}</span>
                        {req.required && (
                          <Badge className="bg-[var(--color-red-soft)] text-[var(--color-red)] border-none text-[9px] px-1.5 py-0 uppercase h-4">Required</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <MatrixAssignmentDropdown
                        projectId={projectId}
                        creditId={credit.id}
                        docType={req.type}
                        currentAssigneeId={req.assigned_user_id || undefined}
                        members={workspace.members}
                        isDisabled={false}
                      />
                    </td>
                  </tr>
                ))}
              </>
            ))}
            {activeCredits.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-[var(--color-text-secondary)] text-[13px]">
                  No active credits with required documents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
