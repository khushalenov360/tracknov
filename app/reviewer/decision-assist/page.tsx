"use client";

import React, { useState } from "react";
import { 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  Sparkles, 
  Layers, 
  ArrowLeftRight, 
  AlertTriangle,
  Clock,
  TrendingUp,
  BrainCircuit,
  Eye
} from "lucide-react";

export default function ReviewerDecisionAssist() {
  const [evidence] = useState({
    id: "E-101",
    name: "Daikin_VRV_Equipment_Schedule_V3.pdf",
    type: "Manufacturer Certificate",
    uploadDate: "May 15, 2026",
    rawContent: "Manufacturer specification details Variable Refrigerant Volume (VRV-IV) with an integrated COP rating of 4.2 under full design load conditions, certified under Eurovent guidelines.",
    entities: [
      { key: "Manufacturer", val: "Daikin" },
      { key: "Rating", val: "COP 4.2" },
      { key: "Technology", val: "VRV-IV" }
    ]
  });

  const [priorHistory] = useState([
    { project: "Bhavarkua Tech Hub", date: "April 2026", outcome: "APPROVED" },
    { project: "Sigma Hospital Wing B", date: "May 2026", outcome: "APPROVED" }
  ]);

  // Reviewer Telemetry
  const [throughput, setThroughput] = useState(24); // items/hr
  const [reversalFrequency] = useState(1.4); // %
  const [decisionConfidence] = useState(99.1); // %

  const [decisionLogs, setDecisionLogs] = useState<string[]>([]);
  const [remarks, setRemarks] = useState("");

  const submitAudit = (decision: "APPROVED" | "FAILED" | "CLARIFICATION") => {
    const log = `[${decision}] Approved validation for ${evidence.name}. Remarks: ${remarks || "None"}`;
    setDecisionLogs((prev) => [log, ...prev]);
    setRemarks("");
    setThroughput((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md px-8 py-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <BrainCircuit className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Auditor Decision Assist Workspace
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
              Reviewer Decision Acceleration Layer & AI Pass-Fail Rationale Engine Active
            </p>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-4 gap-8 overflow-hidden">
        
        {/* Left Side: Side-by-Side Review Workspace (Col Span 3) */}
        <section className="col-span-3 grid grid-cols-2 gap-6 overflow-y-auto pr-2">
          
          {/* View 1: Uploaded Evidence & Extracted Entities */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-b border-slate-850 pb-3 flex justify-between items-center">
                <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Submittal Evidence</span>
                <span className="text-[9px] text-slate-500">Uploaded {evidence.uploadDate}</span>
              </div>
              <h3 className="text-xs font-black text-slate-200">{evidence.name}</h3>

              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl font-mono text-[11px] text-slate-300 leading-relaxed h-44 overflow-y-auto scrollbar-thin">
                {evidence.rawContent}
              </div>

              {/* Extracted Entities */}
              <div className="space-y-2">
                <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Extracted Framework Attributes</span>
                <div className="grid grid-cols-3 gap-2">
                  {evidence.entities.map((ent, i) => (
                    <div key={i} className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl text-[10px]">
                      <span className="block text-slate-500 text-[8px] uppercase font-black">{ent.key}</span>
                      <strong className="text-slate-300 block mt-0.5">{ent.val}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Decision Remarks */}
            <div className="space-y-3 pt-4 border-t border-slate-850">
              <textarea 
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Submit auditor findings or type request for clarification remarks..."
                className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 text-xs text-slate-200 rounded-2xl p-3 placeholder-slate-600 outline-none resize-none"
                rows={2}
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => submitAudit("APPROVED")}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/10"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
                <button 
                  onClick={() => submitAudit("FAILED")}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/10"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
                <button 
                  onClick={() => submitAudit("CLARIFICATION")}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <HelpCircle className="w-4 h-4" />
                  Clarify
                </button>
              </div>
            </div>

          </div>

          {/* View 2: AI Summarizations & Similarity mapping */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl space-y-6 overflow-y-auto scrollbar-thin">
            
            <div className="border-b border-slate-850 pb-3 flex justify-between items-center">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">AI Rationale Harita</span>
              <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                98% CONSISTENCY
              </span>
            </div>

            {/* Pass/Fail Rationales */}
            <div className="space-y-3 text-[11px] text-slate-400">
              <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-1">
                <strong className="text-emerald-400 uppercase font-black text-[9px] tracking-wider block">Likely Pass Rationale</strong>
                <p className="leading-relaxed">
                  Daikin equipment datasheet lists a COP rating of 4.2, exceeding the baseline LEED threshold (3.8 minimum rating).
                </p>
              </div>

              <div className="p-3.5 bg-rose-500/5 border border-rose-500/10 rounded-2xl space-y-1">
                <strong className="text-rose-400 uppercase font-black text-[9px] tracking-wider block">Potential Gaps Identified</strong>
                <p className="leading-relaxed">
                  Verify mechanical drawings confirm the actual refrigeration charge matches standard Eurovent guidelines as stated in page 3.
                </p>
              </div>
            </div>

            {/* Historic approval duplicates */}
            <div className="space-y-3">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Historical Identical Approvals</span>
              <div className="space-y-2">
                {priorHistory.map((hist, i) => (
                  <div key={i} className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between text-[10px]">
                    <span className="font-bold text-slate-300">{hist.project}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{hist.date}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-black text-[9px]">{hist.outcome}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </section>

        {/* Right Side: Performance telemetry and logs (Col Span 1) */}
        <section className="bg-slate-900 border border-slate-850 rounded-3xl p-6 flex flex-col gap-6">
          <div className="border-b border-slate-850 pb-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <TrendingUp className="w-4.5 h-4.5" />
              <h3 className="text-xs font-black uppercase tracking-wider">Reviewer Throughput</h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Measuring decision acceleration benchmarks.</p>
          </div>

          <div className="space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              
              <div className="grid grid-cols-2 gap-3 text-[10px]">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                  <span className="block text-slate-500">Throughput</span>
                  <strong className="text-xs text-slate-200 font-black">{throughput} items/hr</strong>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                  <span className="block text-slate-500">Confidence</span>
                  <strong className="text-xs text-slate-200 font-black">{decisionConfidence}%</strong>
                </div>
              </div>

              {/* Duplicate collapse counts */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl relative overflow-hidden space-y-1">
                <span className="text-[9px] uppercase font-black text-slate-500 block">Duplicate Workloads Collapsed</span>
                <strong className="text-xl font-black text-emerald-400 block">42 documents (+35% Target)</strong>
                <span className="text-[10px] text-slate-500 mt-1 block">Repeated spec sheets and manufacturer certifications automatically grouped.</span>
              </div>

            </div>

            {/* logs */}
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Audit Execution Trail</span>
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl h-44 overflow-y-auto font-mono text-[9px] text-indigo-400 space-y-1.5 scrollbar-thin">
                {decisionLogs.length > 0 ? (
                  decisionLogs.map((log, i) => <p key={i}>{log}</p>)
                ) : (
                  <p className="text-slate-600">No audits recorded in this session.</p>
                )}
              </div>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
