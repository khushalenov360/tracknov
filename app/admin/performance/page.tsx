"use client";

import { BarChart3, Activity, Clock, Zap, LayoutTemplate, ActivitySquare } from "lucide-react";

export default function PerformanceDashboard() {
  const metrics = [
    {
      group: "Core Web Vitals",
      items: [
        { name: "TTFB (Time to First Byte)", p50: "120ms", p95: "340ms", p99: "890ms", icon: Activity },
        { name: "LCP (Largest Contentful Paint)", p50: "1.2s", p95: "1.8s", p99: "2.5s", icon: LayoutTemplate },
        { name: "INP (Interaction to Next Paint)", p50: "45ms", p95: "120ms", p99: "180ms", icon: Zap },
        { name: "CLS (Cumulative Layout Shift)", p50: "0.01", p95: "0.04", p99: "0.08", icon: ActivitySquare },
      ]
    },
    {
      group: "Workspace Architecture",
      items: [
        { name: "Route Transition Load", p50: "85ms", p95: "210ms", p99: "450ms", icon: Clock },
        { name: "Client Hydration Time", p50: "45ms", p95: "110ms", p99: "280ms", icon: Zap },
        { name: "Upload Recovery Start", p50: "180ms", p95: "390ms", p99: "810ms", icon: Activity },
        { name: "Global React Render", p50: "30ms", p95: "90ms", p99: "160ms", icon: LayoutTemplate },
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-[var(--color-border)]">
        <div>
          <h1 className="text-[20px] font-bold text-[var(--color-text-primary)] leading-tight">Performance Audits</h1>
          <p className="text-[14px] text-[var(--color-text-secondary)] mt-1">Real User Monitoring (RUM) Telemetry</p>
        </div>
        <div className="flex gap-2">
          <span className="bg-[var(--color-green-light)] text-[var(--color-green)] text-xs px-2.5 py-1 rounded-full font-bold">
            All Systems Operational
          </span>
        </div>
      </div>

      <div className="space-y-8">
        {metrics.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <h2 className="text-[14px] font-black uppercase text-[var(--color-text-tertiary)]">{section.group}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {section.items.map((metric, mIdx) => {
                const Icon = metric.icon;
                return (
                  <div key={mIdx} className="surface-card p-4 space-y-4 border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="text-xs font-bold text-[var(--color-text-primary)]">{metric.name}</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-xs uppercase font-bold text-[var(--color-text-tertiary)]">P50</span>
                        <span className="text-lg font-black text-[var(--color-green)]">{metric.p50}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-xs uppercase font-bold text-[var(--color-text-tertiary)]">P95</span>
                        <span className="text-sm font-bold text-[var(--color-text-secondary)]">{metric.p95}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-xs uppercase font-bold text-[var(--color-text-tertiary)]">P99</span>
                        <span className="text-sm font-bold text-[var(--color-text-secondary)]">{metric.p99}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
