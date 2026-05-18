"use client";

import React, { useState } from "react";
import { 
  ShoppingBag, 
  Download, 
  Layers, 
  Sparkles, 
  ShieldAlert, 
  Code,
  CheckCircle,
  Play,
  TrendingUp,
  Cpu
} from "lucide-react";
import { SupplierEvidenceMarketplace, MarketplaceEvidencePack } from "../../lib/marketplace/supplierEvidenceMarketplace";
import { ConsultantTemplateRegistry, WorkflowTemplate } from "../../lib/marketplace/consultantTemplateRegistry";
import { PluginSandboxEngine } from "../../lib/marketplace/pluginSandboxEngine";

export default function MarketplacePage() {
  const [packs, setPacks] = useState<MarketplaceEvidencePack[]>(
    SupplierEvidenceMarketplace.getActivePacks()
  );
  
  const [templates, setTemplates] = useState<WorkflowTemplate[]>(
    ConsultantTemplateRegistry.getTemplates()
  );

  const [sandboxCode, setSandboxCode] = useState("const result = input.value * 2;\nreturn result;");
  const [sandboxResult, setSandboxResult] = useState<string>("Ready for sandboxed execution.");
  const [logs, setLogs] = useState<string[]>([
    "Ecosystem Marketplace repository refreshed.",
    "Isolated Micro-VM pools operational."
  ]);

  const executeSandbox = () => {
    try {
      const res = PluginSandboxEngine.executePlugin(sandboxCode, { value: 42 });
      if (res.escapedSandbox) {
        setSandboxResult("BLOCKED: Sandbox Escape Attempt Detected!");
        setLogs((prev) => ["[Security] Halted suspicious script block.", ...prev]);
      } else {
        setSandboxResult(`Success: Return = ${JSON.stringify(res.returnValue)} (${res.executionTimeMs}ms)`);
        setLogs((prev) => ["[Sandbox] Completed execution successfully.", ...prev]);
      }
    } catch (e: any) {
      setSandboxResult(`Error: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md px-8 py-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Tracknov Ecosystem Marketplace
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
              Verified Pre-vetted Supplier Evidence Packages, Reusable Consultant Process Templates, and Sandboxed Integrations
            </p>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-4 gap-8 overflow-hidden">
        
        {/* Left Side: Supplier packs, consultant templates (Col Span 3) */}
        <section className="col-span-3 space-y-6 overflow-y-auto pr-2">
          
          {/* Supplier Evidence Packs */}
          <div className="space-y-3">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Pre-approved Supplier Evidence Packages</span>
            
            <div className="grid grid-cols-2 gap-4">
              {packs.map((pk, idx) => (
                <div key={idx} className="p-5 bg-slate-900 border border-slate-850 hover:border-slate-750 rounded-2xl transition-all flex flex-col gap-3 group">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-all">{pk.supplierName}</h4>
                      <span className="text-[9px] text-slate-500 block mt-1">{pk.materialType}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-[9px] font-black text-indigo-400 uppercase">
                      {pk.ratingStandard}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-850 flex justify-between items-center text-[10px] text-slate-500">
                    <span>Used by <strong>{pk.downloadsCount} projects</strong></span>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-indigo-600 hover:text-white rounded-xl transition-all font-bold">
                      <Download className="w-3.5 h-3.5" />
                      Add to Project
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Consultant Workflow Templates */}
          <div className="space-y-3">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Reusable Consultant Process Templates</span>
            
            {templates.map((temp, idx) => (
              <div 
                key={idx}
                className="p-5 bg-slate-900 border border-slate-850 hover:border-slate-750 rounded-2xl flex items-center justify-between transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-center">
                    <Layers className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-all">
                      {temp.title}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">
                      Target rating: <strong>{temp.targetRating}</strong> • Creator: <strong>{temp.creatorTenantId}</strong>
                    </p>
                  </div>
                </div>

                <button className="px-3 py-1.5 bg-slate-950 hover:bg-indigo-600 hover:text-white rounded-xl transition-all text-[10px] font-bold text-indigo-400 border border-slate-850 hover:border-indigo-500">
                  Clone Template
                </button>
              </div>
            ))}
          </div>

          {/* Integration Sandbox */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Dynamic Integration Plugin Sandbox</span>
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black text-[9px]">
                MICRO-VM ISOLATION PASS
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[9px] font-black uppercase text-slate-500">Plugin Code</label>
                <textarea 
                  value={sandboxCode}
                  onChange={(e) => setSandboxCode(e.target.value)}
                  className="w-full h-32 bg-slate-950 border border-slate-850 text-xs text-slate-300 rounded-xl p-3 outline-none font-mono resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[9px] font-black uppercase text-slate-500">Execution Output</label>
                <div className="w-full h-32 bg-slate-950 border border-slate-850 rounded-xl p-3 font-mono text-xs text-indigo-400 overflow-y-auto">
                  {sandboxResult}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={executeSandbox}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/10"
              >
                <Play className="w-4 h-4" />
                Run Sandbox
              </button>
            </div>
          </div>

        </section>

        {/* Right Side: Marketplace Telemetry & governance metrics (Col Span 1) */}
        <section className="bg-slate-900 border border-slate-850 rounded-3xl p-6 flex flex-col gap-6">
          <div className="border-b border-slate-850 pb-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <ShoppingBag className="w-4.5 h-4.5" />
              <h3 className="text-xs font-black uppercase tracking-wider">Marketplace Health</h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Status of extensions.</p>
          </div>

          <div className="space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-1">
                <span className="text-[9px] uppercase font-black text-slate-500 block">Sandbox Security</span>
                <strong className="text-xl font-black text-emerald-400 block">100% Isolated</strong>
                <span className="text-[10px] text-slate-500 mt-1 block">Zero escape vectors, unauthorized writes, or leakage recorded.</span>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-1">
                <span className="text-[9px] uppercase font-black text-slate-500 block">Supplier Pack Growth</span>
                <strong className="text-xl font-black text-emerald-400 block">+38.5% Growth</strong>
                <span className="text-[10px] text-slate-500 mt-1 block">Pre-vetted structural component documents and parameters.</span>
              </div>

            </div>

            {/* Run logs */}
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Ecosystem Audits</span>
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
