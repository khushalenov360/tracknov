"use client";

import React, { useState } from "react";
import { 
  Building2, 
  ShieldCheck, 
  Layers, 
  HelpCircle, 
  ChevronRight, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  FileCheck,
  RefreshCw
} from "lucide-react";
import { SupplierReuseAnalytics, ReusableSupplierPack } from "../../lib/suppliers/supplierReuseAnalytics";

export default function SupplierNetwork() {
  const [activeFramework, setActiveFramework] = useState("LEED v4");
  const [recommendations, setRecommendations] = useState<ReusableSupplierPack[]>(
    SupplierReuseAnalytics.getRecommendations(activeFramework)
  );

  const [builderLogs, setBuilderLogs] = useState<string[]>([
    "Supplier trust engine synchronized.",
    "Calculated corporate audit histories across 3 global supply lines."
  ]);

  const addLog = (msg: string) => {
    setBuilderLogs((prev) => [`[Linked] ${msg}`, ...prev]);
  };

  const handleBulkReuse = (pack: ReusableSupplierPack) => {
    addLog(`Initiated bulk-reuse on "${pack.name}" compliance bundle. Map verified.`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md px-8 py-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Supplier Intelligence & Reuse Network
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
              Harness verified supplier credentials, minimize review times, and automate structural compliance linking
            </p>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-4 gap-8 overflow-hidden">
        
        {/* Left Side: Supplier recommendations (Col Span 3) */}
        <section className="col-span-3 space-y-6 overflow-y-auto pr-2">
          
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Compounding Supplier Moats</h2>
            <div className="flex bg-slate-900 border border-slate-850 p-1 rounded-xl text-[10px] font-bold">
              {["LEED v4", "IGBC Green", "GRIHA v2019"].map((f) => (
                <button 
                  key={f}
                  onClick={() => {
                    setActiveFramework(f);
                    setRecommendations(SupplierReuseAnalytics.getRecommendations(f));
                  }}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeFramework === f ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Supplier Grid */}
          <div className="space-y-4">
            {recommendations.map((pack, idx) => (
              <div 
                key={idx}
                className="p-6 bg-slate-900 border border-slate-850 hover:border-slate-750 rounded-3xl transition-all flex justify-between items-center group"
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 group-hover:text-indigo-400 transition-all">{pack.name}</h3>
                    <span className="text-[10px] text-slate-500 block mt-1">{pack.category}</span>
                    
                    {/* Reusable files list */}
                    <div className="mt-3.5 space-y-1.5">
                      <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Reusable compliance files</span>
                      <div className="flex gap-2">
                        {pack.reusableFiles.map((file, i) => (
                          <div 
                            key={i} 
                            className="bg-slate-950 border border-slate-850 rounded-lg p-2 text-[10px] text-slate-400 font-mono flex items-center gap-1.5"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
                            {file}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-black text-slate-500 block">Trust Rating</span>
                    <div className="flex items-center gap-1.5 justify-end mt-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <strong className="text-base font-black text-slate-200">{pack.approvalRating}%</strong>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleBulkReuse(pack)}
                    className="px-4 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/20 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    Bulk Reuse
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </section>

        {/* Right Side: Trust Info Cards (Col Span 1) */}
        <section className="bg-slate-900 border border-slate-850 rounded-3xl p-6 flex flex-col gap-6">
          <div className="border-b border-slate-850 pb-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <TrendingUp className="w-4.5 h-4.5" />
              <h3 className="text-xs font-black uppercase tracking-wider">Compliance Analytics</h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Measuring supplier validation loops.</p>
          </div>

          <div className="space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-2">
                <span className="text-[9px] uppercase font-black text-slate-500 block">Supplier Moat Principle</span>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Automatically link pre-approved supplier packets to new submittals. Once certified, these materials bypass common clarification hurdles.
                </p>
                <p className="text-[10px] text-indigo-400 font-bold leading-normal">
                  ⚠️ Note: Human auditor review remains strictly authoritative to block bad files.
                </p>
              </div>

              {/* General reuse rate */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl">
                <span className="text-[9px] uppercase font-black text-slate-500 block">Evidence Reuse Rate</span>
                <strong className="text-xl font-black text-emerald-400 mt-1 block">54.2% (+50% Target)</strong>
                <span className="text-[10px] text-slate-500 mt-1 block">Saved over 250 manual verification cycles this month.</span>
              </div>

            </div>

            {/* Action logs */}
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Inherited Meta Maps</span>
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl h-32 overflow-y-auto font-mono text-[9px] text-indigo-400 space-y-1.5 scrollbar-thin">
                {builderLogs.map((log, idx) => (
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
