import { useState, useEffect, useRef } from "react";
import { Bell, LogOut, User } from "lucide-react";
import { Link, useParams } from "react-router-dom";

export function ResizableWorkspace({
  children,
  harita,
  title,
  description,
  notificationCount,
  email,
  workspaceLabel,
}: {
  children: React.ReactNode;
  harita: React.ReactNode;
  title: React.ReactNode;
  description: string;
  notificationCount?: number;
  email?: string;
  workspaceLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const params = useParams<{ projectId?: string }>();
  const projectId = params.projectId;
  const projectHome = projectId ? `/projects/${projectId}/dashboard` : "/";

  const [userEmail, setUserEmail] = useState<string | undefined>(email);

  useEffect(() => {
    if (email) {
      setUserEmail(email);
    }
  }, [email]);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden" ref={containerRef}>
      
      {/* TOP HEADER BAR */}
      <header className="h-16 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between px-6 shrink-0 z-30">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-bold text-slate-500 tracking-widest">Workspace</span>
          <span className="text-[14px] font-bold text-slate-800">{workspaceLabel || "Tracknov"}</span>
        </div>

        <div className="flex items-center gap-6">
          <Link to={projectHome} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors">
            <Bell className="h-5 w-5" />
            {notificationCount !== undefined && notificationCount > 0 && (
              <span className="bg-rose-500 text-white rounded-full px-1.5 py-0.5 text-xs font-black leading-none">
                {notificationCount}
              </span>
            )}
          </Link>

          <span className="h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center font-bold text-indigo-600 text-sm">
              {(() => {
                if (!userEmail) return <User className="h-4 w-4" />;
                const prefix = userEmail.split("@")[0];
                const parts = prefix.split(/[._-]/).filter(Boolean);
                if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
                if (parts[0] && parts[0].length >= 2) return parts[0].substring(0, 2).toUpperCase();
                if (parts[0]?.[0]) return parts[0][0].toUpperCase();
                return <User className="h-4 w-4" />;
              })()}
            </div>
            <button 
              className="text-slate-500 hover:text-rose-600 transition-colors p-1.5 rounded-md hover:bg-rose-50 ml-1"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* THREE-COLUMN WORKSPACE AREA (including Harita) */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        
        {/* CENTER PANEL: Main active workflow view */}
        <div className="flex-1 flex flex-col p-6 min-h-0 overflow-hidden">
          <main className="flex flex-col gap-4 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-lg p-5 shadow-sm h-full min-h-0 overflow-hidden">
            <div className="border-b border-[var(--color-border)] pb-4 shrink-0">
              <h1 className="text-[20px] font-bold text-[var(--color-text-primary)] leading-tight">{title}</h1>
              <p className="text-[14px] text-[var(--color-text-secondary)] mt-1">{description}</p>
            </div>
            
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              {children}
            </div>
          </main>
        </div>

        {/* HARITA RIGHT PANEL */}
        <aside 
          className="hidden lg:block shrink-0 bg-[var(--color-surface)] border-l border-[var(--color-border)] relative shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] w-[30%]"
        >
          {harita}
        </aside>

        {/* MOBILE HARITA */}
        <div className="lg:hidden">
          {harita}
        </div>
      </div>
    </div>
  );
}
