"use client";

import React, { useState } from "react";
import { 
  Heart, 
  Activity, 
  MousePointer, 
  AlertTriangle, 
  TrendingUp, 
  Sparkles,
  RefreshCw,
  Frown,
  CheckCircle,
  Eye
} from "lucide-react";
import { FrictionAnalyticsEngine, UserFrictionScore } from "../../../lib/telemetry/frictionAnalyticsEngine";
import { UploadFailureTrace } from "../../../lib/telemetry/uploadFailureProfiler";
import { HesitationAudit } from "../../../lib/telemetry/reviewerHesitationTracker";

export default function CustomerRealityPage() {
  const [sessionCount, setSessionCount] = useState(148);
  const [overallFriction, setOverallFriction] = useState<UserFrictionScore>({
    onboardingAbandonmentChance: 24,
    uploadFrictionLevel: "MEDIUM",
    clarificationConfusionIndex: 38
  });

  const [failures, setFailures] = useState<UploadFailureTrace[]>([
    {
      traceId: "ERR-TRACE-5012",
      fileName: "Tata_Steel_Form_16.pdf",
      fileSizeMb: 28.5,
      reason: "SIZE_LIMIT",
      recommendsCompression: true
    },
    {
      traceId: "ERR-TRACE-5018",
      fileName: "VRV_Cooling_Capacity_Spec.xlsx",
      fileSizeMb: 1.2,
      reason: "NETWORK_TIMEOUT",
      recommendsCompression: false
    }
  ]);

  const [hesitations, setHesitations] = useState<HesitationAudit[]>([
    {
      submittalId: "SUBM-771",
      dwellSeconds: 240,
      hoverCount: 2,
      cognitiveFrictionRisk: "HIGH"
    },
    {
      submittalId: "SUBM-782",
      dwellSeconds: 45,
      hoverCount: 12,
      cognitiveFrictionRisk: "LOW"
    }
  ]);

  const [logs, setLogs] = useState<string[]>([
    "Customer Reality telemetry engine online.",
    "Rage-click sensors polling active UI."
  ]);

  const refreshFriction = () => {
    setLogs((prev) => [`[Polled] Updated onboarding profiles and hesitation indices.`, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md px-8 py-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Heart className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Customer Reality & Telemetry Console
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
              Monitor rage clicks, navigation loop alerts, document upload timeouts, and reviewer hesitation levels
            </p>
          </div>
        </div>

        <button 
          onClick={refreshFriction}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/10"
        >
          <RefreshCw className="w-4 h-4 animate-spin-slow" />
          Refresh telemetry
        </button>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-4 gap-8 overflow-hidden">
        
        {/* Left Side: Friction stats, onboarding charts, uploads list (Col Span 3) */}
        <section className="col-span-3 space-y-6 overflow-y-auto pr-2">
          
          {/* Friction Dashboard summary */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-850 p-5 rounded-3xl space-y-1.5">
              <span className="text-[9px] uppercase font-black text-slate-500 block">Onboard Abandonment Risk</span>
              <strong className="text-xl font-black text-amber-500 block">
                {overallFriction.onboardingAbandonmentChance}% Risk
              </strong>
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full" style={{ width: `${overallFriction.onboardingAbandonmentChance}%` }} />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-850 p-5 rounded-3xl space-y-1.5">
              <span className="text-[9px] uppercase font-black text-slate-500 block">Upload Friction Level</span>
              <strong className="text-xl font-black text-slate-300 block">
                {overallFriction.uploadFrictionLevel} Friction
              </strong>
              <span className="text-[10px] text-slate-500 block">Based on user timeout rate calculations.</span>
            </div>

            <div className="bg-slate-900 border border-slate-850 p-5 rounded-3xl space-y-1.5">
              <span className="text-[9px] uppercase font-black text-slate-500 block">Clarification Confusion</span>
              <strong className="text-xl font-black text-rose-500 block">
                {overallFriction.clarificationConfusionIndex}% Confusion
              </strong>
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full" style={{ width: `${overallFriction.clarificationConfusionIndex}%` }} />
              </div>
            </div>
          </div>

          {/* Upload Failures stream */}
          <div className="space-y-3">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block font-black">Document Upload Failures & Recovery Diagnostics</span>
            
            {failures.map((fail, idx) => (
              <div 
                key={idx}
                className="p-5 bg-slate-900 border border-slate-850 hover:border-slate-750 rounded-2xl flex items-center justify-between transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-center">
                    <Frown className="w-5 h-5 text-rose-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-all">
                      {fail.fileName}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">
                      Trace: <strong>{fail.traceId}</strong> • Size: <strong>{fail.fileSizeMb}MB</strong> • Reason: <strong>{fail.reason}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {fail.recommendsCompression && (
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black text-[9px]">
                      COMPRESSION SUGGESTED
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Reviewer Hesitation / Overload */}
          <div className="space-y-3">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Reviewer Hesitation & Cognitive Overload Zones</span>
            <div className="space-y-2">
              {hesitations.map((hes, idx) => (
                <div key={idx} className="p-4 bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl flex justify-between items-center text-[10px]">
                  <div>
                    <strong className="text-slate-300">Submittal: {hes.submittalId}</strong>
                    <span className="text-slate-500 block mt-1">Dwell: {hes.dwellSeconds}s • Clicks: {hes.hoverCount} actions</span>
                  </div>

                  <div className="flex items-center gap-6">
                    {hes.cognitiveFrictionRisk === "HIGH" ? (
                      <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-black text-[9px] flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        OVERLOAD DANGER
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-[9px]">
                        OPTIMAL REVIEW
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </section>

        {/* Right Side: Quick Stats & AI Trust (Col Span 1) */}
        <section className="bg-slate-900 border border-slate-850 rounded-3xl p-6 flex flex-col gap-6">
          <div className="border-b border-slate-850 pb-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <Activity className="w-4.5 h-4.5" />
              <h3 className="text-xs font-black uppercase tracking-wider">Telemetry Core</h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Real-time telemetry indicators.</p>
          </div>

          <div className="space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-1">
                <span className="text-[9px] uppercase font-black text-slate-500 block">Telemetry Delivery Loss</span>
                <strong className="text-xl font-black text-emerald-400 block">0.00% Loss</strong>
                <span className="text-[10px] text-slate-500 mt-1 block">Full delivery guarantee across unstable pilot nodes.</span>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-1">
                <span className="text-[9px] uppercase font-black text-slate-500 block">Ingestion Speed</span>
                <strong className="text-xl font-black text-emerald-400 block">18ms Latency</strong>
                <span className="text-[10px] text-slate-500 mt-1 block">Rage-clicks cataloged instantly on user action.</span>
              </div>

            </div>

            {/* Run logs */}
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Behavior Event log</span>
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl h-24 overflow-y-auto font-mono text-[9px] text-indigo-400 space-y-1 scrollbar-thin">
                {logs.map((log, idx) => (
                  <p key={idx}>{log}</p>
                ))}
              </div>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
