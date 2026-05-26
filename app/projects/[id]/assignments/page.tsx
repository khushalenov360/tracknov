import React from "react";
import { redirect } from "next/navigation";
import { getProjectWorkspace, getCurrentUser } from "@/lib/data";
import { MatrixAssignmentDropdown } from "@/components/project/MatrixAssignmentDropdown";
import { MatrixRequirementDropdown } from "@/components/project/MatrixRequirementDropdown";
import { Badge } from "@/components/ui/badge";
import { canUser } from "@/lib/rbac";
import { AlertCircle, Lock, Unlock } from "lucide-react";
import { toggleProjectAssignmentsLockAction } from "@/app/actions";

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

  const canManage = canUser(workspace.userRole, "MANAGE_TEAM", "TEAM") && !workspace.project.assignments_locked;
  const isAllowed = ["L3", "L5", "project_admin", "super_admin", "super_user"].includes(workspace.userRole);

  // If user is not L3 or L5, redirect them away to the overview
  if (!isAllowed) {
    redirect(`/projects/${projectId}/overview`);
  }

  // Filter out credits that are not applicable
  const activeCredits = workspace.credits.filter(c => c.documents_required?.length > 0);
  const isLocked = !!workspace.project.assignments_locked;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-[var(--color-border)] pb-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[16px] font-bold text-[var(--color-text-primary)]">Project Assignment Matrix</h2>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Rapidly assign responsible team members to individual credit documents without navigating through each workspace.
          </p>
        </div>
        {["project_admin", "super_admin", "super_user", "owner", "L3", "L5"].includes(workspace.userRole) && (
          <form action={toggleProjectAssignmentsLockAction} className="shrink-0">
            <input type="hidden" name="project_id" value={projectId} />
            <button
              type="submit"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all shadow-sm border ${
                isLocked
                  ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                  : "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
              }`}
            >
              {isLocked ? (
                <>
                  <Lock className="w-3 h-3" />
                  Unlock Assignments
                </>
              ) : (
                <>
                  <Unlock className="w-3 h-3" />
                  Lock Assignments
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {isLocked && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Assignments are locked for this project. Contributor assignments are read-only.</span>
        </div>
      )}

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
              <React.Fragment key={credit.id}>
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
                        <MatrixRequirementDropdown
                          projectId={projectId}
                          creditId={credit.id}
                          docType={req.type}
                          isRequired={req.required}
                          allRequiredDocTypes={credit.documents_required.filter((d: any) => d.required).map((d: any) => d.type)}
                          isDisabled={!canManage}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <MatrixAssignmentDropdown
                        projectId={projectId}
                        creditId={credit.id}
                        docType={req.type}
                        currentAssigneeId={req.assigned_user_id || undefined}
                        members={workspace.members}
                        isDisabled={!canManage || !req.required}
                      />
                    </td>
                  </tr>
                ))}
              </React.Fragment>
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
