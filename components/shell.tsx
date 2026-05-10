import Image from "next/image";
import Link from "next/link";
import { Bell, FileText, FolderKanban, Medal, Users, Inbox, ListChecks } from "lucide-react";
import { GlobalCopilot } from "@/components/assistant/global-copilot";
import { SessionHeartbeat } from "@/components/session-heartbeat";
import { Badge } from "@/components/ui/badge";
import { env } from "@/lib/env";
import { roleLabels } from "@/lib/constants";
import type { MemberRole } from "@/lib/types";

export function Shell({
  title,
  description,
  role,
  email: _email,
  notificationCount,
  children,
  aiTitle,
}: {
  title: React.ReactNode;
  description: string;
  role?: MemberRole;
  email?: string;
  notificationCount?: number;
  children: React.ReactNode;
  aiTitle?: string;
}) {
  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: FolderKanban },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/credits", label: "Credits", icon: Medal },
    { href: "/tasks", label: "Tasks", icon: ListChecks },
    { href: "/team", label: "Team", icon: Users },
    ...(["owner", "project_admin", "super_admin", "super_user"].includes(role ?? "")
      ? [{ href: "/review-queue", label: "Review Queue", icon: Inbox }]
      : []),
  ];

  return (
    <div className="app-shell">
      <SessionHeartbeat />
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex min-h-[56px] max-w-[1480px] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/tracknov-logo.svg"
                alt="Tracknov"
                width={206}
                height={40}
                className="h-8 w-auto"
              />
            </Link>
            {role ? (
              <Badge className="border border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[11px] text-[var(--color-green)]">
                {roleLabels[role]}
              </Badge>
            ) : null}
          </div>
          <nav className="order-3 flex w-full flex-wrap gap-1 text-[12px] text-[var(--color-text-secondary)] lg:order-none lg:w-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3 text-[12px] text-[var(--color-text-secondary)]">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 hover:text-[var(--color-text-primary)]">
              <Bell className="h-3.5 w-3.5" />
              <span className="mono text-[11px]">{notificationCount ?? 0}</span>
            </Link>
            <span className="h-4 w-px bg-[var(--color-border)]" aria-hidden="true" />
            <form action="/auth/signout" method="post">
              <button type="submit" className="text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1480px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-1">
          <h1 className="text-[15px] font-medium text-[var(--color-text-primary)]">{title}</h1>
          <p className="text-[12px] text-[var(--color-text-secondary)]">{description}</p>
        </div>
        {children}
      </main>
      <GlobalCopilot 
        enabled={env.aiReady} 
        role={role} 
        title={aiTitle ?? (typeof title === 'string' ? title : 'Tracknov Workspace')} 
        description={description} 
      />
    </div>
  );
}
