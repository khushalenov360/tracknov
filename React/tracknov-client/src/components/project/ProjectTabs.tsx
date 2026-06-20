import { Link, useLocation } from "react-router-dom";
import { canSeeGovernanceTabs, canSeeOperationalExports, isProjectAdminRole, normalizeRole } from "../../lib/roles";

export function ProjectTabs({ projectId, userRole }: { projectId: string; userRole?: string }) {
  const location = useLocation();
  const segment = location.pathname.split("/").pop();
  const normalizedRole = normalizeRole(userRole);
  const isProjectAdmin = isProjectAdminRole(normalizedRole);
  const isGovernanceRole = canSeeGovernanceTabs(normalizedRole);

  const tabs = isProjectAdmin
    ? [
        { key: "my-queue", label: "My Queue" },
        { key: "dashboard", label: "Dashboard" },
        { key: "reviews", label: "Reviews" },
        { key: "approvals", label: "Approvals" },
        { key: "clarifications", label: "Clarifications" },
        { key: "assignments", label: "Assignments" },
        { key: "settings", label: "Settings" },
      ]
    : [
        { key: "my-queue", label: "My Queue" },
        { key: "dashboard", label: "Dashboard" },
        { key: "reviews", label: "Reviews" },
        { key: "uploads", label: "Uploads" },
        { key: "documents", label: "Documents" },
        { key: "approvals", label: "Approvals" },
        { key: "clarifications", label: "Clarifications" },
        { key: "credits", label: "Credits" },
      ];

  if (!isProjectAdmin && isGovernanceRole) {
    tabs.push(
      { key: "assignments", label: "Assignments" },
      { key: "team", label: "Team" }
    );
  }

  if (canSeeOperationalExports(normalizedRole) || normalizedRole === "consultant" || normalizedRole === "architect" || normalizedRole === "mep" || normalizedRole === "contractor") {
    tabs.push(
      { key: "tables", label: "Tables" },
      { key: "exports", label: "Exports" },
      { key: "settings", label: "Settings" }
    );
  }

  return (
    <div className="flex shrink-0 border-b border-[var(--color-border)] mb-6 overflow-x-auto whitespace-nowrap gap-1 sticky top-0 bg-[var(--color-surface)] z-10 pt-1 pb-1">
      {tabs.map((t) => {
        const active =
          segment === t.key ||
          (segment === "reviewer" && t.key === "reviews") ||
          (segment === projectId && t.key === "credits");
        return (
          <Link
            key={t.key}
            to={`/projects/${projectId}/${t.key}`}
            className={`px-4 py-2.5 text-[12px] font-bold transition-all relative ${
              active
                ? "text-[var(--color-green)] border-b-2 border-[var(--color-green)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
