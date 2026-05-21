import Image from "next/image";
import Link from "next/link";
import { 
  Bell, 
  FileText, 
  FolderKanban, 
  Inbox, 
  ListChecks, 
  Bot,
  LayoutDashboard,
  MessageSquare,
  Download,
  Truck,
  BarChart3,
  Settings,
  Search,
  Users
} from "lucide-react";
import { GlobalHarita } from "@/components/assistant/global-harita";
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
  const sidebarNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/credits", label: "Credits", icon: ListChecks },
    { href: "/uploads", label: "Uploads", icon: FileText },
    { href: "/projects", label: "Clarifications", icon: MessageSquare },
    { href: "/review-queue", label: "Reviews", icon: ClipboardListIconForShell },
    { href: "/executive-reports", label: "Reports", icon: BarChart3 },
    { href: "/admin", label: "Admin", icon: Settings },
  ];

  function ClipboardListIconForShell(props: any) {
    return <Inbox {...props} />;
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] font-sans antialiased">
      <SessionHeartbeat />

      {/* LEFT SIDEBAR - Persistent on Large Screens */}
      <aside className="hidden lg:flex w-64 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex-col shrink-0 sticky top-0 h-screen z-40">
        {/* Brand Logo */}
        <div className="h-16 flex items-center px-6 border-b border-[var(--color-border)]">
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/tracknov-logo.svg"
              alt="Tracknov"
              width={160}
              height={32}
              className="h-7 w-auto"
            />
          </Link>
        </div>

        {/* Role Badge Section */}
        {role && (
          <div className="px-6 py-3 border-b border-[var(--color-border)] bg-slate-50/50">
            <p className="text-xs uppercase font-bold text-slate-500 tracking-wider">Access Scope</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-semibold text-slate-700 text-sm">{roleLabels[role]}</span>
              <Badge className="border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 text-xs font-bold">
                L5 Verified
              </Badge>
            </div>
          </div>
        )}

        {/* Vertical Nav List */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          {sidebarNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-all duration-250"
              >
                <Icon className="h-4.5 w-4.5 text-slate-400 group-hover:text-slate-600" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Signout */}
        <div className="p-4 border-t border-[var(--color-border)]">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full text-center px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* RIGHT SIDE CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP HEADER BAR */}
        <header className="h-16 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between px-6 sticky top-0 z-30">
          {/* Organization Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-slate-500 tracking-widest">Workspace</span>
            <span className="text-[14px] font-bold text-slate-800">Enov360 Internal</span>
          </div>

          {/* Search bar & utility profile tools */}
          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Quick search reviews, credits, hash..."
                className="pl-9 pr-4 py-1.5 w-64 border border-[var(--color-border)] rounded-lg text-sm bg-slate-50 focus:outline-none focus:bg-white focus:border-[var(--color-green)]"
              />
            </div>

            {/* Notifications */}
            <Link href="/dashboard" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors">
              <Bell className="h-5 w-5" />
              {notificationCount !== undefined && notificationCount > 0 && (
                <span className="bg-rose-500 text-white rounded-full px-1.5 py-0.5 text-xs font-black leading-none">
                  {notificationCount}
                </span>
              )}
            </Link>

            <span className="h-4 w-px bg-slate-200" />

            {/* Profile Placeholder */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center font-bold text-indigo-600 text-sm">
                {(() => {
                  if (!_email) return "OP";
                  const prefix = _email.split("@")[0];
                  const parts = prefix.split(/[._-]/).filter(Boolean);
                  if (parts.length >= 2) {
                    return (parts[0][0] + parts[1][0]).toUpperCase();
                  }
                  if (parts[0] && parts[0].length >= 2) {
                    return parts[0].substring(0, 2).toUpperCase();
                  }
                  return (parts[0]?.[0] || "U").toUpperCase();
                })()}
              </div>
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT BODY */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6 items-start max-w-[1600px] mx-auto">
            
            {/* CENTER PANEL: Main active workflow view (70% width) */}
            <main className="flex flex-col gap-4 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-lg p-5 min-h-[calc(100vh-140px)] shadow-sm">
              <div className="border-b border-[var(--color-border)] pb-4">
                <h1 className="text-[20px] font-bold text-[var(--color-text-primary)] leading-tight">{title}</h1>
                <p className="text-[14px] text-[var(--color-text-secondary)] mt-1">{description}</p>
              </div>
              
              <div className="flex-1 flex flex-col">
                {children}
              </div>
            </main>

            {/* RIGHT PANEL: Persistent Harita panel (30% width) */}
            <aside className="hidden lg:flex flex-col border border-[var(--color-border)] bg-[var(--color-surface)] rounded-lg overflow-hidden h-[calc(100vh-140px)] shadow-sm sticky top-[88px]">
              <GlobalHarita 
                enabled={env.aiReady} 
                role={role} 
                title={aiTitle ?? (typeof title === 'string' ? title : 'Tracknov Project')} 
                description={description} 
                persistent={true}
              />
            </aside>

          </div>
        </div>
      </div>

      {/* Small screens floating Harita button */}
      <div className="lg:hidden">
        <GlobalHarita 
          enabled={env.aiReady} 
          role={role} 
          title={aiTitle ?? (typeof title === 'string' ? title : 'Tracknov Project')} 
          description={description} 
        />
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex justify-around items-center px-4 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-green)]">
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-xs font-semibold">Home</span>
        </Link>
        <Link href="/review-queue" className="flex flex-col items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-green)]">
          <Inbox className="h-5 w-5" />
          <span className="text-xs font-semibold">Queue</span>
        </Link>
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-green)]">
          <Bot className="h-5 w-5 text-[var(--color-green)]" />
          <span className="text-xs font-semibold">Harita</span>
        </Link>
        <Link href="/projects" className="flex flex-col items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-green)]">
          <FolderKanban className="h-5 w-5" />
          <span className="text-xs font-semibold">Projects</span>
        </Link>
      </nav>
    </div>
  );
}
