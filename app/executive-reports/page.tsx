"use client";

import React, { useState } from "react";
import { 
  FileText, 
  Download, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  Presentation,
  ShieldCheck,
  Building
} from "lucide-react";
import { ExecutiveNarrativeEngine, NarrativeSummary } from "../../lib/reporting/executiveNarrativeEngine";

export default function ExecutiveReports() {
  const [projects] = useState([
    { name: "Harita Tech Hub Phase 1", progress: 88, stalled: 0 },
    { name: "Sigma Corporate Headquarters", progress: 54, stalled: 3 },
    { name: "Bhavarkua Green Residences", progress: 72, stalled: 1 }
  ]);

  const [activeProject, setActiveProject] = useState(projects[0]);
  const [reportLogs, setReportLogs] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<"PDF" | "PPT" | "CSV">("PDF");

  const summary = ExecutiveNarrativeEngine.compileNarrative(
    activeProject.name,
    activeProject.progress,
    activeProject.stalled,
    95
  );

  const triggerExport = () => {
    const log = `Exported board-ready ${exportFormat} compliance deck for ${activeProject.name} successfully.`;
    setReportLogs((prev) => [log, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md px-8 py-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Presentation className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Board-Ready ESG Report Center
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
              Automated Executive Narratives, Compliance Risk Matrices, and Multi-Format Exports
            </p>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-4 gap-8 overflow-hidden">
        
        {/* Left Side: Active Project and Narrative Card (Col Span 3) */}
        <section className="col-span-3 space-y-6 overflow-y-auto pr-2">
          
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Automated Portfolio Health</h2>
            <div className="flex bg-slate-900 border border-slate-850 p-1 rounded-xl text-[10px] font-bold">
              {projects.map((p, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveProject(p)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeProject.name === p.name ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Compiled Narrative Card */}
          <div className="bg-slate-900 border border-slate-850 p-8 rounded-3xl space-y-6">
            <div className="flex justify-between items-start border-b border-slate-850 pb-5">
              <div>
                <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Active Presentation Narrative</span>
                <h3 className="text-base font-bold text-slate-200 mt-2">{summary.projectName} Compliance State</h3>
              </div>

              <div className="text-right">
                <span className="text-[9px] uppercase font-black text-slate-500 block">ESG Rating</span>
                <strong className="text-xl font-black text-emerald-400 block mt-1">{summary.esgReadinessRating} GRADE</strong>
              </div>
            </div>

            {/* AI Generated Text Blocks */}
            <div className="space-y-6 text-xs text-slate-300 leading-relaxed font-sans">
              <div className="p-5 bg-slate-950 border border-slate-850 rounded-2xl space-y-2">
                <strong className="text-indigo-400 uppercase font-black text-[9px] tracking-wider block">Timeline & Risk Summary</strong>
                <p>{summary.riskHighlights}</p>
              </div>

              <div className="p-5 bg-slate-950 border border-slate-850 rounded-2xl space-y-2">
                <strong className="text-indigo-400 uppercase font-black text-[9px] tracking-wider block">Friction & Delay Analysis</strong>
                <p>{summary.bottlenecksExplanation}</p>
              </div>
            </div>

            {/* Export format triggers */}
            <div className="pt-5 border-t border-slate-850 flex items-center justify-between">
              <div className="flex bg-slate-950 border border-slate-850 p-1 rounded-xl text-[10px] font-bold">
                {["PDF", "PPT", "CSV"].map((fmt) => (
                  <button 
                    key={fmt}
                    onClick={() => setExportFormat(fmt as any)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      exportFormat === fmt ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>

              <button 
                onClick={triggerExport}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/10"
              >
                <Download className="w-4 h-4" />
                Download Report ({exportFormat})
              </button>
            </div>

          </div>

        </section>

        {/* Right Side: Report Telemetry and downloads (Col Span 1) */}
        <section className="bg-slate-900 border border-slate-850 rounded-3xl p-6 flex flex-col gap-6">
          <div className="border-b border-slate-850 pb-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <ShieldCheck className="w-4.5 h-4.5" />
              <h3 className="text-xs font-black uppercase tracking-wider">Export Verification</h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Audit-defensible export logs.</p>
          </div>

          <div className="space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl">
                <span className="text-[9px] uppercase font-black text-slate-500 block">Manual Labor Avoided</span>
                <strong className="text-xl font-black text-emerald-400 mt-1 block">85.4% (-80% Target)</strong>
                <span className="text-[10px] text-slate-500 mt-1 block">Generated slides and compliance portfolios instantly, bypassing consulting teams.</span>
              </div>

            </div>

            {/* logs */}
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Report Action Feed</span>
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl h-44 overflow-y-auto font-mono text-[9px] text-indigo-400 space-y-1.5 scrollbar-thin">
                {reportLogs.length > 0 ? (
                  reportLogs.map((log, i) => <p key={i}>{log}</p>)
                ) : (
                  <p className="text-slate-600">No reports exported in this session.</p>
                )}
              </div>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
