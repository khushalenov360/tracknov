"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  FolderKanban, 
  ListChecks, 
  Inbox, 
  BarChart3, 
  Settings,
  Pin,
  PinOff,
  ChevronRight,
  Bot
} from "lucide-react";

export function NavigationRail() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("tracknov_nav_pinned");
    if (saved === "true") {
      setIsPinned(true);
    }
  }, []);

  const togglePin = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    localStorage.setItem("tracknov_nav_pinned", String(newPinned));
  };

  const isExpanded = isHovered || isPinned;

  const navItems = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      label: "Projects",
      icon: FolderKanban,
      href: "/projects",
      subItems: [
        { label: "Active Projects", href: "/projects" },
        { label: "Templates", href: "/projects?tab=templates" },
        { label: "Archives", href: "/projects?tab=archives" },
      ]
    },
    {
      label: "Tasks",
      icon: ListChecks,
      href: "/tasks",
      subItems: [
        { label: "My Tasks", href: "/tasks" },
        { label: "Team Tasks", href: "/tasks?view=team" },
      ]
    },
    {
      label: "Reviews",
      icon: Inbox,
      href: "/review-queue",
      subItems: [
        { label: "Pending Reviews", href: "/review-queue" },
        { label: "Clarifications", href: "/review-queue?tab=clarifications" },
      ]
    },
    {
      label: "Reports",
      icon: BarChart3,
      href: "/executive-reports",
    },
    {
      label: "Administration",
      icon: Settings,
      href: "/admin",
    },
  ];

  if (!mounted) return <div className="hidden lg:flex w-[72px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] h-screen" />;

  return (
    <>
      {/* Spacer for layout push when pinned */}
      {isPinned && <div className="hidden lg:block w-[240px] shrink-0 transition-all duration-300" />}
      {!isPinned && <div className="hidden lg:block w-[72px] shrink-0 transition-all duration-300" />}

      <aside 
        className={`hidden lg:flex flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] h-screen fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out ${isExpanded ? 'w-[240px]' : 'w-[72px]'} overflow-hidden shadow-[2px_0_8px_-2px_rgba(0,0,0,0.05)]`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="h-16 flex items-center px-4 border-b border-[var(--color-border)] shrink-0 justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden whitespace-nowrap min-w-0">
            <div className="w-10 h-10 shrink-0 flex items-center justify-center">
              <Image src="/favicon.ico" alt="Logo" width={24} height={24} className="opacity-80" />
            </div>
            <div className={`font-bold text-lg tracking-tight transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
              Tracknov
            </div>
          </Link>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden scrollbar-hide">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <li key={item.label} className="flex flex-col mb-1">
                  <Link 
                    href={item.href}
                    className={`flex items-center h-12 rounded-lg relative group transition-colors ${isActive ? 'bg-[var(--color-surface-2)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-slate-50 hover:text-slate-900'}`}
                    title={!isExpanded ? item.label : undefined}
                  >
                    <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-[var(--color-green)]' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    </div>
                    
                    <div className={`whitespace-nowrap font-medium text-sm transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                      {item.label}
                    </div>

                    {item.subItems && isExpanded && (
                      <ChevronRight className="w-4 h-4 ml-auto mr-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                    )}
                  </Link>

                  {/* Sub-items */}
                  {item.subItems && isExpanded && (
                    <ul className="mt-1 mb-2 ml-[3.25rem] space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                      {item.subItems.map(subItem => (
                        <li key={subItem.label}>
                          <Link 
                            href={subItem.href}
                            className="block py-1.5 px-2 rounded-md text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors whitespace-nowrap"
                          >
                            {subItem.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Pin toggle at bottom */}
        <div className="p-3 border-t border-[var(--color-border)] shrink-0 flex items-center">
          <button 
            onClick={togglePin}
            className={`w-full flex items-center h-10 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-colors ${isExpanded ? 'px-3 justify-between' : 'justify-center'}`}
            title={isPinned ? "Unpin Navigation" : "Pin Navigation"}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`shrink-0 flex items-center justify-center ${!isExpanded && 'w-10 h-10'}`}>
                {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </div>
              <span className={`text-xs font-semibold whitespace-nowrap transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                {isPinned ? "Unpin Rail" : "Pin Rail"}
              </span>
            </div>
          </button>
        </div>
      </aside>

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
        <button onClick={() => window.dispatchEvent(new Event('toggle-mobile-harita'))} className="flex flex-col items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-green)]">
          <Bot className="h-5 w-5 text-[var(--color-green)]" />
          <span className="text-xs font-semibold">Harita</span>
        </button>
        <Link href="/projects" className="flex flex-col items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-green)]">
          <FolderKanban className="h-5 w-5" />
          <span className="text-xs font-semibold">Projects</span>
        </Link>
      </nav>
    </>
  );
}
