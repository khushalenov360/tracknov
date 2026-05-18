"use client";

import React, { useState } from "react";
import { 
  ShieldAlert, 
  TrendingUp, 
  Users, 
  HelpCircle, 
  Clock, 
  Activity, 
  Sparkles, 
  Play, 
  UserCheck, 
  Search, 
  FileText,
  AlertTriangle,
  FileCheck
} from "lucide-react";

interface PilotTenant {
  organization: string;
  activeProjects: number;
  onboardingCompletion: number;
  uploadFailureRate: number;
  clarificationBacklog: number;
  reviewerResponseLatencyHours: number;
  aiAdoptionRate: number;
  churnRisk: number;
  lastActivity: string;
  alerts: string[];
}

export default function PilotCommandCenter() {
  const [tenants, setTenants] = useState<PilotTenant[]>([
    {
      organization: "Harita Tech Park Developers",
      activeProjects: 3,
      onboardingCompletion: 92,
      uploadFailureRate: 2.1,
      clarificationBacklog: 0,
      reviewerResponseLatencyHours: 4,
      aiAdoptionRate: 94,
      churnRisk: 8,
      lastActivity: "2 mins ago",
      alerts: []
    },
    {
      organization: "Bhavarkua Construction Corp",
      activeProjects: 2,
      onboardingCompletion: 68,
      uploadFailureRate: 12.4,
      clarificationBacklog: 4,
      reviewerResponseLatencyHours: 74,
      aiAdoptionRate: 72,
      churnRisk: 42,
      lastActivity: "2 hours ago",
      alerts: ["Stalled clarifications > 72h", "Support ticket spikes detected"]
    },
    {
      organization: "Sigma Green Consultants",
      activeProjects: 4,
      onboardingCompletion: 24,
      uploadFailureRate: 35.8,
      clarificationBacklog: 8,
      reviewerResponseLatencyHours: 240,
      aiAdoptionRate: 38,
      churnRisk: 88,
      lastActivity: "6 days ago",
      alerts: [
        "Inactive tenant > 5 days",
        "Repeated upload failures",
        "Excessive reviewer overrides",
        "Onboarding abandoned"
      ]
    }
  ]);

  const [selectedTenant, setSelectedTenant] = useState<PilotTenant | null>(tenants[1]);
  const [impersonationActive, setImpersonationActive] = useState(false);
  const [operationsLog, setOperationsLog] = useState<string[]>([
    "Initial load of Pilot Command Center telemetry core.",
    "System status: 100% active, listening to websocket ingress.",
  ]);

  const addLog = (msg: string) => {
    setOperationsLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const triggerImpersonation = () => {
    if (!selectedTenant) return;
    setImpersonationActive(!impersonationActive);
    if (!impersonationActive) {
      addLog(`Impersonating support session for tenant: ${selectedTenant.organization}`);
    } else {
      addLog(`Terminated support impersonation session.`);
    }
  };

  const triggerReplay = () => {
    if (!selectedTenant) return;
    addLog(`Replaying onboarding session for tenant: ${selectedTenant.organization}`);
  };

  const inspectUploads = () => {
    if (!selectedTenant) return;
    addLog(`Inspecting upload telemetry logs for: ${selectedTenant.organization}`);
  };

  const inspectAiRejections = () => {
    if (!selectedTenant) return;
    addLog(`Querying AI rejection metrics and reasoning delta scores for: ${selectedTenant.organization}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md px-8 py-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            C
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wide bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Pilot Command & Control Plane
            </h1>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">
              Central Operational Visibility and Live Customer Health Indicators
            </p>
          </div>
        </div>

        {impersonationActive && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black animate-pulse">
            <UserCheck className="w-3.5 h-3.5" />
            SUPPORT IMPERSONATION ACTIVE
          </div>
        )}
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-4 gap-8 overflow-hidden">
        
        {/* Left Side: Live Table & Alerts (Col span 3) */}
        <section className="col-span-3 space-y-6 overflow-y-auto pr-2">
          
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: "Active Tenants", value: "3 Sites Active", desc: "No manual supervision needed" },
              { label: "Critical Risks", value: "1 Site (RED)", desc: "Immediate retention target" },
              { label: "Avg AI Guideline Trust", value: "68.2%", desc: "High verification accuracy" }
            ].map((m, i) => (
              <div key={i} className="bg-slate-900 border border-slate-850 p-5 rounded-2xl">
                <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">{m.label}</p>
                <p className="text-xl font-black text-slate-200 mt-1">{m.value}</p>
                <p className="text-[10px] text-slate-500 mt-1">{m.desc}</p>
              </div>
            ))}
          </div>

          {/* Health Table */}
          <div className="bg-slate-900 border border-slate-850 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-slate-850">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Live Customer Health Table</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 bg-slate-950/40 text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                    <th className="p-4 pl-6">Organization</th>
                    <th className="p-4 text-center">Onboarding</th>
                    <th className="p-4 text-center">Upload Fails</th>
                    <th className="p-4 text-center">Backlog</th>
                    <th className="p-4 text-center">Review Latency</th>
                    <th className="p-4 text-center">AI Adopt</th>
                    <th className="p-4 text-right pr-6">Churn Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {tenants.map((row, idx) => (
                    <tr 
                      key={idx}
                      onClick={() => setSelectedTenant(row)}
                      className={`hover:bg-slate-950/30 transition-all text-xs cursor-pointer ${
                        selectedTenant?.organization === row.organization ? "bg-indigo-600/5 text-slate-100 font-bold" : "text-slate-400"
                      }`}
                    >
                      <td className="p-4 pl-6">
                        <span className="block font-bold text-slate-200">{row.organization}</span>
                        <span className="text-[10px] text-slate-500 font-medium">Projects: {row.activeProjects} • Active {row.lastActivity}</span>
                      </td>
                      <td className="p-4 text-center">{row.onboardingCompletion}%</td>
                      <td className={`p-4 text-center ${row.uploadFailureRate > 10 ? "text-rose-400 font-bold" : ""}`}>{row.uploadFailureRate}%</td>
                      <td className="p-4 text-center">{row.clarificationBacklog} items</td>
                      <td className="p-4 text-center">{row.reviewerResponseLatencyHours}h</td>
                      <td className="p-4 text-center">{row.aiAdoptionRate}%</td>
                      <td className="p-4 text-right pr-6">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                          row.churnRisk >= 75 ? "bg-rose-500/10 text-rose-400" :
                          row.churnRisk >= 35 ? "bg-amber-500/10 text-amber-400" :
                          "bg-emerald-500/10 text-emerald-400"
                        }`}>
                          {row.churnRisk}% Risk
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Risk Alerts */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Automated Risk Alerts & Blockers</h4>
            
            <div className="grid grid-cols-2 gap-4">
              {tenants.map((t, idx) => {
                if (t.alerts.length === 0) return null;
                return (
                  <div key={idx} className="p-4 bg-rose-500/5 border border-rose-500/15 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-rose-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs font-bold truncate">{t.organization}</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-[10px] text-slate-400">
                      {t.alerts.map((a, aIdx) => (
                        <li key={aIdx}>{a}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

        </section>

        {/* Right Side: Operational Panel (Col span 1) */}
        <section className="bg-slate-900 border border-slate-850 rounded-3xl p-6 flex flex-col gap-6">
          <div className="border-b border-slate-850 pb-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Execution Operations Panel</h3>
            <p className="text-[10px] text-slate-500 mt-1">Simulate support and replay session audits.</p>
          </div>

          {selectedTenant ? (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl">
                  <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Selected Client</span>
                  <p className="text-xs font-bold text-slate-300 truncate">{selectedTenant.organization}</p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={triggerImpersonation}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/15"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    {impersonationActive ? "Stop Impersonation" : "Impersonate Support Mode"}
                  </button>

                  <button 
                    onClick={triggerReplay}
                    className="w-full py-2.5 bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 text-indigo-400" />
                    Replay Onboarding Session
                  </button>

                  <button 
                    onClick={inspectUploads}
                    className="w-full py-2.5 bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Search className="w-3.5 h-3.5 text-indigo-400" />
                    Inspect Upload Telemetry
                  </button>

                  <button 
                    onClick={inspectAiRejections}
                    className="w-full py-2.5 bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    Inspect AI Rejections
                  </button>
                </div>
              </div>

              {/* Logs */}
              <div className="space-y-2">
                <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Operations Log</span>
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl h-40 overflow-y-auto font-mono text-[9px] text-indigo-400/90 space-y-1.5 scrollbar-thin">
                  {operationsLog.map((log, idx) => (
                    <p key={idx} className="leading-normal">{log}</p>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-slate-500 text-xs">
              Select a tenant from the table to activate operations panel.
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
