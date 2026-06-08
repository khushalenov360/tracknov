"use client";

import { useState } from "react";
import { CheckCircle2, Lock, ArrowRight, ChevronRight } from "lucide-react";
import { MilestoneStatus, StageGateMilestone } from "@/lib/harita-engine/services/stage-gate-service";

interface StageGateTrackerProps {
  milestones: StageGateMilestone[];
}

export function StageGateTracker({ milestones }: StageGateTrackerProps) {
  return (
    <div className="space-y-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Construction Stage-Gates</h3>
        <span className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium">v3.0 Engine</span>
      </div>
      
      <div className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-[1px] before:bg-[var(--color-border)]">
        {milestones.map((milestone) => (
          <MilestoneRow key={milestone.id} milestone={milestone} />
        ))}
      </div>
    </div>
  );
}

function MilestoneRow({ milestone }: { milestone: StageGateMilestone }) {
  const isInitiallyActive = milestone.status === "IN_PROGRESS";
  const [isOpen, setIsOpen] = useState(isInitiallyActive);

  return (
    <div className="relative pl-8 group">
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
          <button 
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 text-left font-medium text-[12px] text-[var(--color-text-primary)] focus:outline-none hover:text-[var(--color-green)]"
          >
            <ChevronRight className={`h-3 w-3 text-[var(--color-text-tertiary)] transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`} />
            <span className={milestone.status === "LOCKED" ? "text-[var(--color-text-tertiary)]" : "text-[var(--color-text-primary)]"}>
              {milestone.name}
            </span>
          </button>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusStyles(milestone.status)}`}>
            {milestone.status.replace("_", " ")}
          </span>
        </div>
        
        {isOpen && milestone.criteria.length > 0 && (
          <ul className="space-y-1.5 pt-2 pl-3 border-l border-[var(--color-border)] ml-[4px] transition-all duration-200">
            {milestone.criteria.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
                <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 opacity-40" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
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
