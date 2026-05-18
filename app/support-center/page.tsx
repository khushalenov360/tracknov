"use client";

import React, { useState } from "react";
import { 
  LifeBuoy, 
  RefreshCw, 
  UserCheck, 
  Search, 
  AlertTriangle, 
  CheckCircle,
  Activity,
  Play,
  FileText,
  Cpu
} from "lucide-react";
import { SupportReplayDiagnostics } from "../../lib/support/supportReplayDiagnostics";
import { TenantImpersonationAudit } from "../../lib/support/tenantImpersonationAudit";
import { UploadFailureTraceEngine } from "../../lib/support/uploadFailureTraceEngine";
import { ClarificationLineageExplorer } from "../../lib/support/clarificationLineageExplorer";
import { ExportFailureAnalyzer } from "../../lib/support/exportFailureAnalyzer";

export default function SupportCenterPage() {
  const [impersonateTenant, setImpersonateTenant] = useState("tenant-alpha");
  const [justification, setJustification] = useState("Resolving missing HVAC invoice mapping error");
  const [traceId, setTraceId] = useState("ERR-TRACE-5012");
  
  const [traceResult, setTraceResult] = useState<any>({
    traceId: "ERR-TRACE-5012",
    bytesReceived: 1200000,
    expectedBytes: 15000000,
    completedPercent: 8,
    networkLatencyMs: 4800
  });

  const [logs, setLogs] = useState<string[]>([
    "Support terminal secure login established.",
    "Bypassed direct database mutations successfully."
  ]);

  const [simulatedReplay, setSimulatedReplay] = useState<string[]>([
    "Step 1: Loaded Submittal Builder (2.4s)",
    "Step 2: Dragged Tata_Steel_Form_16.pdf (1.2s)",
    "Step 3: Clicked 'Submit Validation' - CRASH: Upload Timeout"
  ]);

  const runImpersonation = () => {
    TenantImpersonationAudit.logImpersonation("support-agent-01", impersonateTenant, justification);
    setLogs((prev) => [`[Audit Logged] Impersonating ${impersonateTenant} (Justification: ${justification})`, ...prev]);
  };

  const runTrace = () => {
    const res = UploadFailureTraceEngine.traceUpload(traceId);
    setTraceResult(res);
    setLogs((prev) => [`[Traced] Located slow upload packet trail for ${traceId}`, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md px-8 py-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <LifeBuoy className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Tracknov Support Operations Console
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
              Safe Tenant Impersonation, Document Ingestion Failures, Replay Diagnostic Tracing, and Export Lineages
            </p>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-4 gap-8 overflow-hidden">
        
        {/* Left Side: Replays, Impersonations, failures (Col Span 3) */}
        <section className="col-span-3 space-y-6 overflow-y-auto pr-2">
          
          {/* Safe Impersonation Widget */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl space-y-4">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Audited Tenant Impersonation Portal</span>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-500 mb-2">Target Tenant ID</label>
                <input 
                  type="text" 
                  value={impersonateTenant}
                  onChange={(e) => setImpersonateTenant(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-xs text-slate-300 rounded-xl p-2.5 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-slate-500 mb-2">Justification Note</label>
                <input 
                  type="text" 
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-xs text-slate-300 rounded-xl p-2.5 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={runImpersonation}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/10"
              >
                <UserCheck className="w-4 h-4" />
                Initialize Audited Session
              </button>
            </div>
          </div>

          {/* Session Replay Simulator */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl space-y-3">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Diagnostic Onboard Session Replay Simulator</span>
            
            <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-2">
              {simulatedReplay.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-[10px] font-mono text-slate-300">
                  <span className="text-indigo-400">✓</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upload failure trace logs */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl space-y-4">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Upload Packet & latency Failure Tracing</span>
            
            <div className="grid grid-cols-3 gap-4 items-end">
              <div className="col-span-2">
                <label className="block text-[9px] font-black uppercase text-slate-500 mb-2">Active Trace ID</label>
                <input 
                  type="text" 
                  value={traceId}
                  onChange={(e) => setTraceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-xs text-slate-300 rounded-xl p-2.5 outline-none font-mono"
                />
              </div>

              <button 
                onClick={runTrace}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/10"
              >
                <Search className="w-4 h-4" />
                Diagnose Ingestion
              </button>
            </div>

            {traceResult && (
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl text-[10px] grid grid-cols-2 gap-4 font-mono">
                <div>
                  <span className="text-[9px] uppercase font-black text-slate-500 block">Completed Ratio</span>
                  <strong className="text-rose-400 block mt-1">{traceResult.completedPercent}% Uploaded</strong>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-black text-slate-500 block">Network Latency</span>
                  <strong className="text-rose-400 block mt-1">{traceResult.networkLatencyMs}ms Delay</strong>
                </div>
              </div>
            )}
          </div>

        </section>

        {/* Right Side: SLA telemetry cards (Col Span 1) */}
        <section className="bg-slate-900 border border-slate-850 rounded-3xl p-6 flex flex-col gap-6">
          <div className="border-b border-slate-850 pb-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <Activity className="w-4.5 h-4.5" />
              <h3 className="text-xs font-black uppercase tracking-wider">Support SLA Metrics</h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Real-time status of critical incident logs.</p>
          </div>

          <div className="space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-1">
                <span className="text-[9px] uppercase font-black text-slate-500 block">Incident Resolution Time</span>
                <strong className="text-xl font-black text-emerald-400 block">&lt; 42 Minutes</strong>
                <span className="text-[10px] text-slate-500 mt-1 block">Surpassing target 1-hour commercial SLA boundaries.</span>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-1">
                <span className="text-[9px] uppercase font-black text-slate-500 block">Root-Cause Isolation</span>
                <strong className="text-xl font-black text-emerald-400 block">&lt; 3.5 Minutes</strong>
                <span className="text-[10px] text-slate-500 mt-1 block">Average time to detect upload or rendering issues.</span>
              </div>

            </div>

            {/* Run logs */}
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Support Session log</span>
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
