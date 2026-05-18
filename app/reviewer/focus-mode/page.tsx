"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  Clock, 
  Sparkles, 
  Layers, 
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  BrainCircuit,
  EyeOff
} from "lucide-react";

interface EvidenceDocument {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  duplicateGroup?: string;
  alreadyReviewed: boolean;
  textSnippet: string;
}

export default function ReviewerFocusMode() {
  const [evidence, setEvidence] = useState<EvidenceDocument[]>([
    {
      id: "E-101",
      name: "HVAC_Commissioning_Report_Signed.pdf",
      type: "Signed Report",
      uploadDate: "May 12, 2026",
      alreadyReviewed: false,
      textSnippet: "Section 4.1: Chilled water flow tests completed and verified by Harita lead engineers. Return temperatures aligned with Daikin standard design specifications of 7.2C."
    },
    {
      id: "E-102",
      name: "HVAC_Commissioning_Report_Duplicate_V2.pdf",
      type: "Signed Report",
      uploadDate: "May 13, 2026",
      duplicateGroup: "HVAC_COMM_REPORTS",
      alreadyReviewed: true,
      textSnippet: "Section 4.1: Chilled water flow tests completed and verified by Harita lead engineers. Return temperatures aligned with Daikin standard design specifications of 7.2C."
    },
    {
      id: "E-103",
      name: "Daikin_VRV_Equipment_Schedule.pdf",
      type: "Technical Datasheet",
      uploadDate: "May 10, 2026",
      alreadyReviewed: false,
      textSnippet: "Manufacturer specification sheet details variable refrigerant volume models VRV-IV with an integrated COP rating of 4.2 under full design load conditions."
    }
  ]);

  const [activeEvidence, setActiveEvidence] = useState<EvidenceDocument>(evidence[0]);
  const [collapseDuplicates, setCollapseDuplicates] = useState(true);
  
  // Fatigue Telemetry
  const [reviewDuration, setReviewDuration] = useState(180); // in seconds (3 mins)
  const [fatigueScore, setFatigueScore] = useState(12); // 0 to 100
  const [throughput, setThroughput] = useState(18); // items per hour
  const [reversalFrequency, setReversalFrequency] = useState(2); // %
  const [decisionConsistency, setDecisionConsistency] = useState(98); // %

  // Form State
  const [rationale, setRationale] = useState("");
  const [decisionLog, setDecisionLog] = useState<string[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setReviewDuration((prev) => prev + 1);
      // Heuristic: fatigue rises slowly, throughput stays stable
      if (reviewDuration > 600) {
        setFatigueScore(Math.min(95, Math.round(12 + (reviewDuration - 600) * 0.08)));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [reviewDuration]);

  const submitDecision = (status: "APPROVED" | "REJECTED" | "CLARIFICATION") => {
    const text = rationale.trim() || `No additional remarks specified.`;
    setDecisionLog((prev) => [`[${status}] ${activeEvidence.name}: ${text}`, ...prev]);
    setRationale("");
    
    // Switch to next unreviewed evidence item if available
    const nextItem = evidence.find(
      (e) => e.id !== activeEvidence.id && (!collapseDuplicates || !e.duplicateGroup || !e.alreadyReviewed)
    );
    if (nextItem) {
      setActiveEvidence(nextItem);
    }
    
    setThroughput((prev) => prev + 1);
    setFatigueScore((prev) => Math.max(0, prev - 4)); // Submitting decisions keeps focus high
  };

  const formattedTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? "0" : ""}${remaining}`;
  };

  const filteredEvidence = collapseDuplicates
    ? evidence.filter((e) => !e.duplicateGroup || !e.alreadyReviewed)
    : evidence;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-violet-600 selection:text-white">
      
      {/* Distraction-Free Focused Header */}
      <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <BrainCircuit className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-200">
              Single-Focus Auditor Console
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
              Reviewer Execution Optimization & Cognitive Fatigue Guard Active
            </p>
          </div>
        </div>

        {/* Live Fatigue Telemetry Guard */}
        <div className="flex items-center gap-8 text-[11px] font-bold text-slate-400">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Session Duration: <strong className="text-slate-200">{formattedTime(reviewDuration)}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Fatigue Index:</span>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                fatigueScore > 70 ? "bg-rose-500/10 text-rose-400" :
                fatigueScore > 40 ? "bg-amber-500/10 text-amber-400" :
                "bg-emerald-500/10 text-emerald-400"
              }`}>
                {fatigueScore}% {fatigueScore > 70 ? "HIGH - TAKE BREAK" : "OPTIMAL"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Single-Focus Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-4 gap-8 overflow-hidden">
        
        {/* Left Side: Focused Workspace (Col Span 3) */}
        <section className="col-span-3 flex flex-col gap-6">
          
          {/* Active Credit context */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full">
                  Current Credit: Energy Efficiency (E-C1)
                </span>
                <h2 className="text-base font-black text-slate-200 mt-3">
                  HVAC Performance Optimization and Variable Flow Alignments
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Verify chilling water return flow schedules match local green guidelines (7.2C ± 0.5C standard).
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-850">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">AI Score: 98% MATCH</span>
              </div>
            </div>
          </div>

          {/* Core Evidence Viewport */}
          <div className="flex-1 bg-slate-900 border border-slate-850 rounded-3xl p-8 flex flex-col gap-6">
            <div className="border-b border-slate-850 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider">Focused Evidence Document</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">{activeEvidence.name} (Uploaded: {activeEvidence.uploadDate})</p>
                </div>
              </div>

              {activeEvidence.duplicateGroup && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-bold">
                  <Layers className="w-3.5 h-3.5" />
                  DUPLICATE DETECTED
                </div>
              )}
            </div>

            {/* Readability content extract */}
            <div className="flex-1 p-6 bg-slate-950 border border-slate-850 rounded-2xl font-mono text-xs text-slate-300 leading-relaxed overflow-y-auto max-h-72 scrollbar-thin">
              <p className="border-l-2 border-indigo-500 pl-4 py-1 italic text-slate-400 mb-4">
                [Auto-Extracted Context Section for Rapid Auditing]
              </p>
              {activeEvidence.textSnippet}
            </div>

            {/* Verification Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-2">
                  Auditor Decision Rationale
                </label>
                <textarea 
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  placeholder="Provide precise review rationales for compliance or identify gaps for clarification..."
                  className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-slate-200 rounded-2xl p-4 placeholder-slate-600 outline-none transition-all resize-none"
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button 
                  onClick={() => submitDecision("APPROVED")}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve Evidence
                </button>

                <button 
                  onClick={() => submitDecision("REJECTED")}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/10"
                >
                  <XCircle className="w-4 h-4" />
                  Reject Evidence
                </button>

                <button 
                  onClick={() => submitDecision("CLARIFICATION")}
                  className="flex-1 py-3 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <HelpCircle className="w-4 h-4" />
                  Request Clarification
                </button>
              </div>
            </div>

          </div>

        </section>

        {/* Right Side: AI Assist & Queue (Col Span 1) */}
        <section className="bg-slate-900 border border-slate-850 rounded-3xl p-6 flex flex-col gap-6">
          
          {/* AI Fatigue Assist */}
          <div className="border-b border-slate-850 pb-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <Sparkles className="w-4 h-4" />
              <h3 className="text-xs font-black uppercase tracking-wider">AI Fatigue Assist</h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Smart filters collapsing duplicated workloads.</p>
          </div>

          <div className="space-y-4 flex-1">
            {/* Duplicates Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-850 rounded-xl text-[10px] font-bold">
              <span className="text-slate-400">Collapse Duplicates</span>
              <button 
                onClick={() => setCollapseDuplicates(!collapseDuplicates)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  collapseDuplicates ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-500"
                }`}
              >
                {collapseDuplicates ? "ACTIVE" : "INACTIVE"}
              </button>
            </div>

            {/* Smart Summarizer Card */}
            <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-2">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">AI Assessment Context</span>
              <p className="text-[10px] text-slate-400 leading-normal">
                This document duplicates E-102. Content matches previous submittals. Reviewer decision recommends **AUTO-ACCEPT** to prevent cognitive fatigue.
              </p>
            </div>

            {/* Metrics List */}
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Performance Heuristics</span>
              <div className="grid grid-cols-2 gap-3 text-[10px]">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                  <span className="block text-slate-500">Throughput</span>
                  <strong className="text-xs text-slate-300 font-black">{throughput}/hr</strong>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                  <span className="block text-slate-500">Consistency</span>
                  <strong className="text-xs text-slate-300 font-black">{decisionConsistency}%</strong>
                </div>
              </div>
            </div>

            {/* Queued Evidence List */}
            <div className="space-y-2 flex-1">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Auditing Queue</span>
              <div className="space-y-2">
                {filteredEvidence.map((e, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setActiveEvidence(e)}
                    className={`p-3 rounded-xl border text-[10px] flex items-center justify-between cursor-pointer transition-all ${
                      activeEvidence.id === e.id 
                        ? "bg-indigo-500/10 border-indigo-500 text-slate-200" 
                        : "bg-slate-950 border-slate-850 text-slate-500 hover:border-slate-750"
                    }`}
                  >
                    <span className="font-bold truncate max-w-[120px]">{e.name}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Decision Logs */}
          {decisionLog.length > 0 && (
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Audited Records</span>
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl max-h-24 overflow-y-auto text-[9px] text-slate-400 font-mono space-y-1 scrollbar-thin">
                {decisionLog.map((log, idx) => (
                  <p key={idx}>{log}</p>
                ))}
              </div>
            </div>
          )}

        </section>

      </main>
    </div>
  );
}
