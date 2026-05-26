"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

export function ProjectTabs({ projectId, userRole }: { projectId: string; userRole?: string }) {
  const segment = useSelectedLayoutSegment();

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "credits", label: "Credits" },
    { key: "documents", label: "Documents" },
    { key: "clarifications", label: "Clarifications" },
  ];

  if (userRole && ["L3", "L5", "project_admin", "super_admin", "super_user"].includes(userRole)) {
    tabs.push({ key: "assignments", label: "Assignments" });
  }

  tabs.push(
    { key: "exports", label: "Exports" },
    { key: "settings", label: "Settings" }
  );

  return (
    <div className="flex shrink-0 border-b border-[var(--color-border)] mb-6 overflow-x-auto whitespace-nowrap gap-1 sticky top-0 bg-[var(--color-surface)] z-10 pt-1 pb-1">
      {tabs.map((t) => {
        const active = segment === t.key;
        return (
          <Link
            key={t.key}
            href={`/projects/${projectId}/${t.key}`}
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
