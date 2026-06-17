import { Link, useLocation } from "react-router-dom";

export function ProjectTabs({ projectId, userRole }: { projectId: string; userRole?: string }) {
  const location = useLocation();
  const segment = location.pathname.split("/").pop();

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "credits", label: "Credits" },
    { key: "documents", label: "Documents" },
    { key: "clarifications", label: "Clarifications" },
  ];

  if (userRole && ["L3", "L5", "project_admin", "super_admin", "super_user"].includes(userRole)) {
    tabs.push(
      { key: "reviewer", label: "Reviewer" },
      { key: "assignments", label: "Assignments" },
      { key: "team", label: "Team" }
    );
  }

  tabs.push(
    { key: "tables", label: "Tables" },
    { key: "exports", label: "Exports" },
    { key: "settings", label: "Settings" }
  );

  return (
    <div className="flex shrink-0 border-b border-[var(--color-border)] mb-6 overflow-x-auto whitespace-nowrap gap-1 sticky top-0 bg-[var(--color-surface)] z-10 pt-1 pb-1">
      {tabs.map((t) => {
        const active =
          segment === t.key ||
          (segment === "dashboard" && t.key === "overview") ||
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
