"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Hourglass, 
  AlertTriangle, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  ChevronDown,
  Layers,
  Sparkles,
  GitBranch
} from "lucide-react";
import { ExecutionTimelinePredictor, PredictiveCriticalPath } from "@tracknov/harita-engine/orchestration/executionTimelinePredictor";

interface PredictiveStep {
  code: string;
  name: string;
  historicalClarifications: number;
  reviewerVelocity: number;
  supplierDelay: number;
  quality: number;
  dependencyCode?: string;
  blocked: boolean;
}

export default function ExecutionTimelineView() {
  const [steps] = useState<PredictiveStep[]>([
    {
      code: "E-C1",
      name: "HVAC Water Cooling Commissioning",
      historicalClarifications: 1,
      reviewerVelocity: 8,
      supplierDelay: 2,
      quality: 95,
      blocked: false
    },
    {
      code: "MR-C2",
      name: "Recycled Steel Supplier Verification",
      historicalClarifications: 4,
      reviewerVelocity: 3,
      supplierDelay: 10,
      quality: 42,
      dependencyCode: "E-C1",
      blocked: true
    },
    {
      code: "IAQ-C3",
      name: "Low-VOC Interior Adhesives Audit",
      historicalClarifications: 0,
      reviewerVelocity: 9,
      supplierDelay: 1,
      quality: 88,
      blocked: false
    }
  ]);

  const [activeStep, setActiveStep] = useState<PredictiveStep>(steps[1]);
  const [prediction, setPrediction] = useState<PredictiveCriticalPath | null>(null);

  useEffect(() => {
    const res = ExecutionTimelinePredictor.predictTimeline({
      creditCode: activeStep.code,
      historicalClarificationsCount: activeStep.historicalClarifications,
      reviewerVelocityIndex: activeStep.reviewerVelocity,
      supplierResponseDelayDays: activeStep.supplierDelay,
      documentIntegrityQuality: activeStep.quality
    });
    setPrediction(res);
  }, [activeStep]);

  return (
    <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl space-y-6 selection:bg-indigo-600 selection:text-white">
      
      {/* View Header */}
      <div className="flex items-center justify-between border-b border-slate-850 pb-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider">Predictive Execution Timeline</h3>
            <p className="text-xs text-slate-500 mt-0.5">Statistical path mapping using historical reviewer and supplier velocities.</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs px-2 py-0.5 rounded font-black">
          <Sparkles className="w-3.5 h-3.5" />
          CONFIDENCE-ADJUSTED MAP
        </div>
      </div>

      {/* Steps / Dependency graph simulation */}
      <div className="grid grid-cols-3 gap-4">
        {steps.map((step, idx) => (
          <div 
            key={idx}
            onClick={() => setActiveStep(step)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 relative ${
              activeStep.code === step.code
                ? "bg-slate-950 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                : "bg-slate-950/40 border-slate-850 hover:border-slate-750"
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Credit {step.code}</span>
              {step.blocked && (
                <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-[9px] font-black text-rose-400">
                  BLOCKED
                </span>
              )}
            </div>

            <h4 className="text-xs font-bold text-slate-200 truncate mt-1">{step.name}</h4>

            {step.dependencyCode && (
              <span className="text-[9px] text-slate-500 font-medium">
                Depends on: <strong>{step.dependencyCode}</strong>
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Dynamic predictive outcome details */}
      {prediction && (
        <div className="p-5 bg-slate-950 border border-slate-850 rounded-2xl grid grid-cols-3 gap-6 items-center">
          
          {/* Target Approval Date */}
          <div className="space-y-1.5 border-r border-slate-850 pr-4">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Estimated Approval</span>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <strong className="text-sm font-black text-slate-200">{prediction.targetApprovalDate}</strong>
            </div>
            <span className="text-xs text-slate-500 block">Total delay days: {prediction.criticalPathDelayDays}d</span>
          </div>

          {/* Risk Level and Reviewer Congestion */}
          <div className="space-y-1.5 border-r border-slate-850 px-4">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Timeline Risk Target</span>
            <div className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${
                prediction.stalledRiskLevel === "HIGH" ? "bg-rose-500 animate-pulse" :
                prediction.stalledRiskLevel === "MEDIUM" ? "bg-amber-500" :
                "bg-emerald-500"
              }`} />
              <strong className="text-xs font-bold text-slate-200 uppercase tracking-wider">{prediction.stalledRiskLevel} RISK PROFILE</strong>
            </div>
            <span className="text-xs text-slate-500 block">Reviewer Congestion Index: {prediction.reviewerCongestionFactor}/10</span>
          </div>

          {/* Hotspots */}
          <div className="space-y-1.5 pl-4">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Critical Path Bottlenecks</span>
            {prediction.hotspots.length > 0 ? (
              <div className="space-y-1">
                {prediction.hotspots.map((h, i) => (
                  <span key={i} className="text-[9px] font-bold text-amber-400 block">• {h}</span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-emerald-400 font-bold block flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Zero bottlenecks predicted
              </span>
            )}
          </div>

        </div>
      )}

      {/* Active Timeline Graph Representation */}
      <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-3">
        <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Milestone Progress Track</span>
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex flex-col items-center">
            <span className="text-indigo-400 font-black">Step 1</span>
            <span className="text-[9px] text-slate-500 mt-1">Ingest</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-700" />
          <div className="flex flex-col items-center">
            <span className={activeStep.quality >= 70 ? "text-indigo-400 font-black" : "text-rose-400 font-black"}>Step 2</span>
            <span className="text-[9px] text-slate-500 mt-1">Preflight</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-700" />
          <div className="flex flex-col items-center">
            <span className={!activeStep.blocked ? "text-indigo-400 font-black" : "text-rose-400 font-black"}>Step 3</span>
            <span className="text-[9px] text-slate-500 mt-1">Audit</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-700" />
          <div className="flex flex-col items-center text-right">
            <span className="text-slate-500">Step 4</span>
            <span className="text-[9px] text-slate-500 mt-1">Approve</span>
          </div>
        </div>
      </div>

    </div>
  );
}
