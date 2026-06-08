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
import { NavigationRail } from "@/components/navigation-rail";
import { ResizableWorkspace } from "@/components/resizable-workspace";
import { Badge } from "@/components/ui-lib/ui/badge";
import { env } from "@/lib/env";
import type { MemberRole } from "@/lib/types";
export function Shell({
  title,
  description,
  role,
  email,
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
    { href: "/tasks", label: "Tasks", icon: ListChecks },
    { href: "/review-queue", label: "Reviews", icon: ClipboardListIconForShell },
    { href: "/executive-reports", label: "Reports", icon: BarChart3 },
    { href: "/admin", label: "Administration", icon: Settings },
  ];

  function ClipboardListIconForShell(props: any) {
    return <Inbox {...props} />;
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] font-sans antialiased overflow-hidden">
      <SessionHeartbeat />
      
      <NavigationRail />

      <ResizableWorkspace 
        harita={
          <GlobalHarita 
            enabled={env.aiReady} 
            role={role} 
            title={aiTitle ?? (typeof title === 'string' ? title : 'Tracknov Project')} 
            description={description} 
          />
        }
        title={title}
        description={description}
        notificationCount={notificationCount}
        email={email}
      >
        {children}
      </ResizableWorkspace>
    </div>
  );
}
