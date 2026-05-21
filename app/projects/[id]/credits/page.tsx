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

  const isL0Contributor = ["mep", "architect", "contractor"].includes(workspace.userRole);
  const roleScopedCredits = isL0Contributor
    ? workspace.credits.filter((credit: any) => !credit.responsible_role || credit.responsible_role === workspace.userRole)
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

      <div className="surface-card overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse text-xs text-left min-w-[800px]">
            <thead className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
              <tr>
                <th className="px-3 py-2 font-bold uppercase text-[var(--color-text-tertiary)]">Code</th>
                <th className="px-3 py-2 font-bold uppercase text-[var(--color-text-tertiary)]">Title</th>
                <th className="px-3 py-2 text-right font-bold uppercase text-[var(--color-text-tertiary)]">Points</th>
                <th className="px-3 py-2 text-left font-bold uppercase text-[var(--color-text-tertiary)]">Status</th>
                <th className="px-3 py-2 text-left font-bold uppercase text-[var(--color-text-tertiary)]">Reviewer / Rep.</th>
                <th className="px-3 py-2 text-left font-bold uppercase text-[var(--color-text-tertiary)]">Blockers / Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredCredits.map((credit: any) => {
                const selected = credit.id === selectedCreditId;
                const creditStatus = toLegacyCreditStatus(credit.state ?? credit.status);
                const isBlocked = creditStatus === "blocked";
                return (
                  <tr
                    key={credit.id}
                    className={`hover:bg-[var(--color-surface-2)] transition-colors ${
                      selected ? "bg-[var(--color-green-light)]" : ""
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/projects/${projectId}/documents?credit=${credit.id}`}
                        className="font-mono font-black text-[var(--color-green)] hover:underline"
                      >
                        {mandatoryCode(credit.credit_code, credit.is_mandatory)}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/projects/${projectId}/documents?credit=${credit.id}`}
                        className="font-bold text-[var(--color-text-primary)] hover:underline"
                      >
                        {credit.credit_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[var(--color-text-secondary)]">
                      {Number(credit.available_points ?? 0).toFixed(1)}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge className={creditStatuses[creditStatus]}>
                        {creditStatus.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--color-text-secondary)] font-medium">
                      {credit.responsible_role ? String(credit.responsible_role).replace("_", " ") : "Unassigned"}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--color-text-tertiary)] font-medium truncate max-w-[280px]">
                      {isBlocked ? (
                        <span className="text-[var(--color-red)] font-bold flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {credit.remarks?.[0]?.body || "Blocked by validation checkpoint"}
                        </span>
                      ) : (
                        credit.remarks?.[0]?.body || ""
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col divide-y divide-[var(--color-border)]">
          {filteredCredits.map((credit: any) => {
            const selected = credit.id === selectedCreditId;
            const creditStatus = toLegacyCreditStatus(credit.state ?? credit.status);
            const isBlocked = creditStatus === "blocked";
            return (
              <div key={credit.id} className={`p-4 space-y-3 ${selected ? "bg-[var(--color-green-light)]" : ""}`}>
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <Link
                      href={`/projects/${projectId}/documents?credit=${credit.id}`}
                      className="font-mono font-black text-[var(--color-green)] hover:underline block"
                    >
                      {mandatoryCode(credit.credit_code, credit.is_mandatory)}
                    </Link>
                    <Link
                      href={`/projects/${projectId}/documents?credit=${credit.id}`}
                      className="font-bold text-[var(--color-text-primary)] hover:underline block leading-snug"
                    >
                      {credit.credit_name}
                    </Link>
                  </div>
                  <Badge className={`shrink-0 ${creditStatuses[creditStatus]}`}>
                    {creditStatus.replace("_", " ")}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center text-xs text-[var(--color-text-secondary)]">
                  <span>Pts: <strong className="text-[var(--color-text-primary)]">{Number(credit.available_points ?? 0).toFixed(1)}</strong></span>
                  <span>Rep: <strong className="text-[var(--color-text-primary)]">{credit.responsible_role ? String(credit.responsible_role).replace("_", " ") : "Unassigned"}</strong></span>
                </div>
                
                {credit.remarks?.[0]?.body && (
                  <div className="bg-[var(--color-surface-2)] p-2 rounded border border-[var(--color-border)] mt-2">
                    {isBlocked ? (
                      <span className="text-[var(--color-red)] font-bold flex items-center gap-1.5 text-xs">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {credit.remarks?.[0]?.body || "Blocked by validation checkpoint"}
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-tertiary)] font-medium text-xs">
                        {credit.remarks?.[0]?.body}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
