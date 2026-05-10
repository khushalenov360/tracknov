"use client";

import { CheckCircle2, Circle, Lock, ArrowRight } from "lucide-react";
import { MilestoneStatus, StageGateMilestone } from "@/lib/services/stage-gate-service";

interface StageGateTrackerProps {
  milestones: StageGateMilestone[];
}

export function StageGateTracker({ milestones }: StageGateTrackerProps) {
  return (
    <div className="space-y-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Construction Stage-Gates</h3>
        <span className="text-[11px] text-[var(--color-text-tertiary)] uppercase tracking-wider">v3.0 Engine</span>
      </div>
      
      <div className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-[1px] before:bg-[var(--color-border)]">
        {milestones.map((milestone, index) => (
          <div key={milestone.id} className="relative pl-8 group">
            <div className="absolute left-0 top-0 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface)] ring-4 ring-[var(--color-surface)]">
              {milestone.status === "COMPLETED" ? (
                <CheckCircle2 className="h-5 w-5 text-[var(--color-green)]" />
              ) : milestone.status === "IN_PROGRESS" ? (
                <div className="h-3 w-3 rounded-full bg-[var(--color-blue)] animate-pulse" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
              )}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className={`text-[12px] font-medium ${milestone.status === "LOCKED" ? "text-[var(--color-text-tertiary)]" : "text-[var(--color-text-primary)]"}`}>
                  {milestone.name}
                </p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusStyles(milestone.status)}`}>
                  {milestone.status.replace("_", " ")}
                </span>
              </div>
              
              <ul className="space-y-1.5 pt-1">
                {milestone.criteria.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-[var(--color-text-secondary)]">
                    <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 opacity-40" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getStatusStyles(status: MilestoneStatus) {
  switch (status) {
    case "COMPLETED":
      return "border-[var(--color-green-light)] bg-[var(--color-green-soft)] text-[var(--color-green)]";
    case "IN_PROGRESS":
      return "border-[var(--color-blue-light)] bg-[var(--color-blue-soft)] text-[var(--color-blue)]";
    case "LOCKED":
    default:
      return "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]";
  }
}
