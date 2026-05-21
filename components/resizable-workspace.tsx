"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Bell } from "lucide-react";
import Link from "next/link";

export function ResizableWorkspace({
  children,
  harita,
  title,
  description,
  notificationCount,
  email,
}: {
  children: React.ReactNode;
  harita: React.ReactNode;
  title: React.ReactNode;
  description: string;
  notificationCount?: number;
  email?: string;
}) {
  const [haritaWidth, setHaritaWidth] = useState(30); // Default to 30%
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("tracknov_harita_width");
    if (saved) {
      const parsed = parseFloat(saved);
      if (parsed >= 25 && parsed <= 40) {
        setHaritaWidth(parsed);
      }
    }
  }, []);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const onDrag = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      // Calculate new width as percentage of container
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidthPx = containerRect.right - e.clientX;
      const newWidthPercent = (newWidthPx / containerRect.width) * 100;

      // Clamp between 25% and 40%
      const clampedWidth = Math.min(Math.max(newWidthPercent, 25), 40);
      setHaritaWidth(clampedWidth);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      localStorage.setItem("tracknov_harita_width", String(haritaWidth));
    };

    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", onMouseUp);

    // Prevent text selection during drag
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      document.removeEventListener("mousemove", onDrag);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging, haritaWidth]);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden" ref={containerRef}>
      
      {/* TOP HEADER BAR */}
      <header className="h-16 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between px-6 shrink-0 z-30">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-bold text-slate-500 tracking-widest">Workspace</span>
          <span className="text-[14px] font-bold text-slate-800">Enov360 Internal</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Quick search reviews, credits, hash..."
              className="pl-9 pr-4 py-1.5 w-64 border border-[var(--color-border)] rounded-lg text-sm bg-slate-50 focus:outline-none focus:bg-white focus:border-[var(--color-green)]"
            />
          </div>

          <Link href="/dashboard" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors">
            <Bell className="h-5 w-5" />
            {notificationCount !== undefined && notificationCount > 0 && (
              <span className="bg-rose-500 text-white rounded-full px-1.5 py-0.5 text-xs font-black leading-none">
                {notificationCount}
              </span>
            )}
          </Link>

          <span className="h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center font-bold text-indigo-600 text-sm">
              {(() => {
                if (!email) return "OP";
                const prefix = email.split("@")[0];
                const parts = prefix.split(/[._-]/).filter(Boolean);
                if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
                if (parts[0] && parts[0].length >= 2) return parts[0].substring(0, 2).toUpperCase();
                return (parts[0]?.[0] || "U").toUpperCase();
              })()}
            </div>
          </div>
        </div>
      </header>

      {/* THREE-COLUMN WORKSPACE AREA (including Harita) */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        
        {/* CENTER PANEL: Main active workflow view */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          <main className="flex flex-col gap-4 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-lg p-5 shadow-sm min-h-full">
            <div className="border-b border-[var(--color-border)] pb-4 shrink-0">
              <h1 className="text-[20px] font-bold text-[var(--color-text-primary)] leading-tight">{title}</h1>
              <p className="text-[14px] text-[var(--color-text-secondary)] mt-1">{description}</p>
            </div>
            
            <div className="flex-1 flex flex-col min-h-0">
              {children}
            </div>
          </main>
        </div>

        {/* DRAGGABLE SPLITTER */}
        <div 
          className="hidden lg:block w-1 bg-[var(--color-border)] hover:bg-indigo-400 hover:w-1.5 cursor-col-resize shrink-0 transition-colors z-20"
          onMouseDown={startDrag}
        />

        {/* HARITA RIGHT PANEL */}
        <aside 
          className="hidden lg:block shrink-0 bg-white border-l border-[var(--color-border)] relative shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]"
          style={{ width: `${haritaWidth}%` }}
        >
          {harita}
          {isDragging && (
            <div className="absolute inset-0 z-50 bg-transparent" /> // Overlay to block pointer events during drag
          )}
        </aside>

        {/* MOBILE HARITA (Handled mostly inside global-harita itself via custom events or fixed modal if needed, but we keep the floating mount point) */}
        <div className="lg:hidden">
          {harita}
        </div>
      </div>
    </div>
  );
}
