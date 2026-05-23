import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { creditStats, getProjectWorkspace } from "@/lib/data";
import { creditStatuses } from "@/lib/constants";
import { toLegacyCreditStatus } from "@/lib/workflow-utils";

export const dynamic = "force-dynamic";

function mandatoryCode(creditCode: string, mandatory: boolean) {
  if (!mandatory || creditCode.includes("MR")) {
    return creditCode;
  }
  const parts = creditCode.split(" ");
  return `${parts[0]} MR ${parts.slice(1).join(" ")}`.trim();
}

export default async function ProjectCreditsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string; status?: string; credit?: string }>;
}) {
  const { id: projectId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const workspace = await getProjectWorkspace(projectId);

  if (!workspace) return null;

  const user = await import("@/lib/data").then(m => m.getCurrentUser());
  const isL0Contributor = ["mep", "architect", "contractor"].includes(workspace.userRole);
  const roleScopedCredits = isL0Contributor
    ? workspace.credits.filter((credit: any) => {
        if (!credit.responsible_role) return true;
        if (credit.responsible_role === workspace.userRole) return true;
        if (!user) return false;
        return credit.documents_required?.some(
          (doc: any) => doc.assigned_user_id === user.id || doc.assigned_role === workspace.userRole
        );
      })
    : workspace.credits;

  const stats = creditStats(roleScopedCredits);

  const filteredCredits = roleScopedCredits.filter((credit: any) => {
    const categoryOk = resolvedSearchParams?.category ? credit.category === resolvedSearchParams.category : true;
    const statusOk = resolvedSearchParams?.status ? toLegacyCreditStatus(credit.state ?? credit.status) === resolvedSearchParams.status : true;
    return categoryOk && statusOk;
  });

  const selectedCreditId = resolvedSearchParams?.credit ?? filteredCredits[0]?.id;

  return (
    <div className="space-y-4 text-left">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Link
            href={`/projects/${projectId}/credits`}
            className={`whitespace-nowrap px-3 py-1 text-xs font-bold rounded-lg border ${
              !resolvedSearchParams?.category
                ? "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-primary)]"
                : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
            }`}
          >
            All Credits
          </Link>
          {stats.categories.map((c) => (
            <Link
              key={c.key}
              href={`/projects/${projectId}/credits?category=${c.key}`}
              className={`whitespace-nowrap px-3 py-1 text-xs font-bold rounded-lg border ${
                resolvedSearchParams?.category === c.key
                  ? "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-primary)]"
                  : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
              }`}
            >
              {c.key}
            </Link>
          ))}
        </div>
        <Badge className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-bold text-xs shrink-0 mb-2">
          {filteredCredits.length} Credits Filtered
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCredits.map((credit: any) => {
          const selected = credit.id === selectedCreditId;
          const creditStatus = toLegacyCreditStatus(credit.state ?? credit.status);
          const isBlocked = creditStatus === "blocked";
          return (
            <div key={credit.id} className={`surface-card p-5 flex flex-col space-y-4 hover:border-[var(--color-green)] transition-all ${selected ? "border-[var(--color-green)] ring-1 ring-[var(--color-green)]" : ""}`}>
              <div className="flex justify-between items-start gap-3">
                <div className="space-y-1">
                  <span className="font-mono font-black text-[var(--color-green)] text-xs block">
                    {mandatoryCode(credit.credit_code, credit.is_mandatory)}
                  </span>
                  <h3 className="font-bold text-[var(--color-text-primary)] leading-snug">
                    {credit.credit_name}
                  </h3>
                </div>
                <Badge className={`shrink-0 ${creditStatuses[creditStatus]}`}>
                  {creditStatus.replace("_", " ")}
                </Badge>
              </div>
              
                <div className="space-y-2 flex-1">
                <div className="flex justify-between items-center text-xs text-[var(--color-text-secondary)]">
                  <span>Points</span>
                  <strong className="text-[var(--color-text-primary)]">{Number(credit.available_points ?? 0).toFixed(1)}</strong>
                </div>
                <div className="flex justify-between items-center text-xs text-[var(--color-text-secondary)]">
                  <span>Owner</span>
                  <strong className="text-[var(--color-text-primary)] uppercase">
                    {(() => {
                      if (credit.responsible_role) return String(credit.responsible_role).replace("_", " ");
                      const assignedDocs = credit.documents_required?.filter((d: any) => d.assigned_role || d.assigned_name) || [];
                      if (assignedDocs.length === 0) return "UNASSIGNED";
                      const uniqueRoles = Array.from(new Set(assignedDocs.map((d: any) => d.assigned_role).filter(Boolean)));
                      if (uniqueRoles.length === 1) return String(uniqueRoles[0]).replace("_", " ");
                      if (uniqueRoles.length > 1) return "MIXED CONTRIBUTORS";
                      return "ASSIGNED";
                    })()}
                  </strong>
                </div>
                {credit.remarks?.[0]?.body && (
                  <div className="bg-[var(--color-surface-2)] p-2.5 rounded-lg border border-[var(--color-border)] mt-2">
                    {isBlocked ? (
                      <span className="text-[var(--color-red)] font-bold flex items-center gap-1.5 text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{credit.remarks?.[0]?.body || "Blocked by validation checkpoint"}</span>
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-tertiary)] font-medium text-xs line-clamp-2">
                        {credit.remarks?.[0]?.body}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[var(--color-border)]">
                <Link
                  href={`/projects/${projectId}/documents?credit=${credit.id}`}
                  className="w-full flex items-center justify-center py-2 px-4 bg-[var(--color-surface-2)] hover:bg-[var(--color-green-soft)] text-[var(--color-text-primary)] hover:text-[var(--color-green)] text-xs font-bold rounded-lg border border-[var(--color-border)] hover:border-[var(--color-green-light)] transition-colors"
                >
                  Open Workspace
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
