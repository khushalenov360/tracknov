import Image from "next/image";
import Link from "next/link";
import { Bell, FileText, FolderKanban, Medal, Users, Inbox, ListChecks, Bot } from "lucide-react";
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
    { href: "/review-queue", label: "Reviews", icon: Inbox },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/documents", label: "Documents", icon: FileText },
    ...(["owner", "project_admin", "super_admin", "super_user", "L3", "L5"].includes(role ?? "")
      ? [{ href: "/review-queue", label: "Approvals", icon: ListChecks }]
      : []),
  ];

  return (
    <div className="app-shell pb-16 lg:pb-0">
      <SessionHeartbeat />
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] sticky top-0 z-30">
        <div className="mx-auto flex min-h-[56px] max-w-[1700px] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
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
                  key={item.label}
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

      <div className="mx-auto max-w-[1700px] w-full px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6 items-start">
          {/* CENTER PANEL: Main active workflow view (70% width) */}
          <main className="flex flex-col gap-4 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl p-6 min-h-[calc(100vh-120px)] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="mb-2 flex flex-col gap-1 border-b border-[var(--color-border)] pb-3">
              <h1 className="text-[16px] font-semibold text-[var(--color-text-primary)]">{title}</h1>
              <p className="text-[12px] text-[var(--color-text-secondary)]">{description}</p>
            </div>
            {children}
          </main>

          {/* RIGHT PANEL: Persistent copilot panel */}
          <aside className="hidden lg:flex flex-col border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl overflow-hidden h-[calc(100vh-120px)] shadow-[0_2px_8px_rgba(0,0,0,0.04)] sticky top-[76px]">
            <GlobalCopilot 
              enabled={env.aiReady} 
              role={role} 
              title={aiTitle ?? (typeof title === 'string' ? title : 'Tracknov Project')} 
              description={description} 
              persistent={true}
            />
          </aside>
        </div>
      </div>

      {/* Small screens floating copilot */}
      <div className="lg:hidden">
        <GlobalCopilot 
          enabled={env.aiReady} 
          role={role} 
          title={aiTitle ?? (typeof title === 'string' ? title : 'Tracknov Project')} 
          description={description} 
        />
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex justify-around items-center px-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] shrink-0">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-green)]">
          <FolderKanban className="h-4.5 w-4.5" />
          <span className="text-[9px] font-medium">Home</span>
        </Link>
        <Link href="/review-queue" className="flex flex-col items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-green)]">
          <Inbox className="h-4.5 w-4.5" />
          <span className="text-[9px] font-medium">Queue</span>
        </Link>
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-green)]">
          <Bot className="h-4.5 w-4.5 text-[var(--color-green)]" />
          <span className="text-[9px] font-medium">Copilot</span>
        </Link>
        <Link href="/projects" className="flex flex-col items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-green)]">
          <ListChecks className="h-4.5 w-4.5" />
          <span className="text-[9px] font-medium">Projects</span>
        </Link>
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-green)]">
          <Bell className="h-4.5 w-4.5" />
          <span className="text-[9px] font-medium">Alerts</span>
        </Link>
      </nav>
    </div>
  );
}
