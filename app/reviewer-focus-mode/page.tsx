"use client";

import React, { useState, useEffect } from "react";
import { ReviewerFatigueEngine, ReviewActionLog } from "@/lib/reviewer/reviewerFatigueEngine";
import { 
  Sparkles, 
  BrainCircuit, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle, 
  Minimize2, 
  Maximize2, 
  ChevronDown, 
  ChevronUp, 
  Flame, 
  Clock, 
  Send,
  Zap
} from "lucide-react";

// Mock submittals for Customer Zero Review Queue
interface SubmittalItem {
  id: string;
  creditName: string;
  category: string;
  confidenceScore: number; // 0 to 1
  priority: "URGENT_CLARIFICATION" | "HIGH_CONFIDENCE" | "STALLED_CREDIT" | "RISKY_PROJECT";
  evidenceCount: number;
  uploadedAt: string;
  duplicatesFound: number;
  previousApprovedCount: number;
  latestNotes: string;
}

export default function ReviewerFocusMode() {
  const [submittals, setSubmittals] = useState<SubmittalItem[]>([
    {
      id: "sub-01",
      creditName: "Energy Saving - Lighting Design v1.0",
      category: "Energy Efficiency",
      confidenceScore: 0.96,
      priority: "HIGH_CONFIDENCE",
      evidenceCount: 4,
      uploadedAt: "10 mins ago",
      duplicatesFound: 1,
      previousApprovedCount: 3,
      latestNotes: "Upload contains exact matching certified manufacturer catalog spec sheet from our approved catalog library."
    },
    {
      id: "sub-02",
      creditName: "Water Quality - Filtration Efficiency",
      category: "Water Stewardship",
      confidenceScore: 0.45,
      priority: "URGENT_CLARIFICATION",
      evidenceCount: 2,
      uploadedAt: "1 hour ago",
      duplicatesFound: 0,
      previousApprovedCount: 0,
      latestNotes: "Missing signed third-party laboratory safety certifications. Ingestion OCR reports incomplete stamp marks."
    },
    {
      id: "sub-03",
      creditName: "Low Carbon Material Selection",
      category: "Materials & Resources",
      confidenceScore: 0.78,
      priority: "STALLED_CREDIT",
      evidenceCount: 8,
      uploadedAt: "3 days ago",
      duplicatesFound: 2,
      previousApprovedCount: 5,
      latestNotes: "Review has stalled for 72 hours due to conflicting emission factors. Material composition values need verification."
    },
    {
      id: "sub-04",
      creditName: "Occupant Comfort - IAQ Sensors",
      category: "Indoor Environment",
      confidenceScore: 0.32,
      priority: "RISKY_PROJECT",
      evidenceCount: 5,
      uploadedAt: "4 hours ago",
      duplicatesFound: 1,
      previousApprovedCount: 1,
      latestNotes: "Project has a historical 75% submittal rejection rate. High risk of non-compliance across indoor ventilation credits."
    }
  ]);

  const [activeSubmittal, setActiveSubmittal] = useState<SubmittalItem | null>(submittals[0]);
  const [actionLogs, setActionLogs] = useState<ReviewActionLog[]>([]);
  const [fatigueReport, setFatigueReport] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"focus" | "all">("focus");
  const [aiDraftNote, setAiDraftNote] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    duplicates: true,
    previouslyApproved: true,
    repeatedClarifications: true,
  });

  // Calculate fatigue state dynamically based on session logs
  useEffect(() => {
    const report = ReviewerFatigueEngine.analyzeFatigue(actionLogs);
    setFatigueReport(report);
  }, [actionLogs]);

  // AI draft helpers to reduce clicks/writing
  useEffect(() => {
    if (activeSubmittal) {
      if (activeSubmittal.priority === "HIGH_CONFIDENCE") {
        setAiDraftNote("We verified compliance of the submitted manufacturer sheets with the standard catalog specifications. Approved.");
      } else if (activeSubmittal.priority === "URGENT_CLARIFICATION") {
        setAiDraftNote("Please provide the formal third-party filtration laboratory test report with original signatures. Current scans lack legible seal stamps.");
      } else {
        setAiDraftNote("The evidence submitted requires additional low-carbon lifecycle emission certificates to align with the framework rules.");
      }
    }
  }, [activeSubmittal]);

  const recordReviewAction = (type: "APPROVE" | "REJECT" | "CLARIFICATION") => {
    if (!activeSubmittal) return;

    const newLog: ReviewActionLog = {
      actionId: `act-${Date.now()}`,
      reviewerId: "reviewer_l5_01",
      timestamp: new Date().toISOString(),
      actionType: type,
      durationMs: Math.round(5000 + Math.random() * 25000), // simulated time spent
      submittalId: activeSubmittal.id,
    };

    setActionLogs((prev) => [...prev, newLog]);

    // Move to next submittal in queue
    const remaining = submittals.filter(s => s.id !== activeSubmittal.id);
    setSubmittals(remaining);
    setActiveSubmittal(remaining.length > 0 ? remaining[0] : null);
  };

  const getPriorityBadge = (priority: SubmittalItem["priority"]) => {
    switch (priority) {
      case "URGENT_CLARIFICATION":
        return <span className="bg-rose-950/60 border border-rose-900/60 text-rose-400 text-[10px] font-black px-2 py-0.5 rounded-full">Urgent Clarification Needed</span>;
      case "HIGH_CONFIDENCE":
        return <span className="bg-emerald-950/60 border border-emerald-900/60 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full">AI Verified (Auto-Pass Candidate)</span>;
      case "STALLED_CREDIT":
        return <span className="bg-amber-950/60 border border-amber-900/60 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full">Stalled Progress (Needs Push)</span>;
      case "RISKY_PROJECT":
        return <span className="bg-indigo-950/60 border border-indigo-900/60 text-indigo-400 text-[10px] font-black px-2 py-0.5 rounded-full">Complex Auditable Target</span>;
    }
  };

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Premium Header */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wide bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Reviewer Focus Console
            </h1>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">
              Antidote for Reviewer Cognitive Fatigue & High Velocity Audits
            </p>
          </div>
        </div>

        {/* Fatigue Status Bar */}
        {fatigueReport && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-1.5">
              <Flame className={`w-4 h-4 ${
                fatigueReport.level === "CRITICAL" ? "text-rose-500 animate-pulse" :
                fatigueReport.level === "HIGH" ? "text-amber-500" : "text-emerald-400"
              }`} />
              <div>
                <p className="text-[9px] uppercase font-black text-slate-500 tracking-widest">Cognitive Load Meter</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200">{fatigueReport.level}</span>
                  <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        fatigueReport.level === "CRITICAL" ? "bg-rose-500" :
                        fatigueReport.level === "HIGH" ? "bg-amber-500" : "bg-emerald-400"
                      }`}
                      style={{ width: `${fatigueReport.fatigueScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-1.5 text-center">
              <p className="text-[9px] uppercase font-black text-slate-500 tracking-widest">Decisions Made</p>
              <p className="text-xs font-bold text-slate-200">{actionLogs.length} submittals</p>
            </div>
          </div>
        )}
      </header>

      {/* Warnings Panel if fatigue level is high */}
      {fatigueReport?.isOverloaded && (
        <div className="bg-amber-500/10 border-b border-amber-500/25 px-8 py-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <div className="text-xs text-amber-300 font-semibold space-y-0.5">
            {fatigueReport.warnings.map((warn: string, idx: number) => (
              <p key={idx}>{warn}</p>
            ))}
          </div>
        </div>
      )}

      {/* Main Workspace split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Priority Queue list */}
        <aside className="w-80 border-r border-slate-900 bg-slate-900/10 p-6 flex flex-col gap-4 overflow-y-auto">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Focus Priority Queue</h3>
            <span className="bg-indigo-900/40 text-indigo-400 border border-indigo-900/60 text-[10px] font-black px-2 py-0.5 rounded">
              {submittals.length} remaining
            </span>
          </div>

          <div className="space-y-3">
            {submittals.map((sub) => (
              <div
                key={sub.id}
                onClick={() => setActiveSubmittal(sub)}
                className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                  activeSubmittal?.id === sub.id
                    ? "bg-indigo-600/10 border-indigo-500/50 shadow-md shadow-indigo-950/20"
                    : "bg-slate-900/30 border-slate-900 hover:border-slate-800 hover:bg-slate-900/50"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">{sub.category}</span>
                    <span className={`text-[10px] font-bold ${
                      sub.confidenceScore >= 0.8 ? "text-emerald-400" : sub.confidenceScore >= 0.5 ? "text-amber-400" : "text-rose-400"
                    }`}>
                      {(sub.confidenceScore * 100).toFixed(0)}% AI Conf.
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 truncate">{sub.creditName}</h4>
                  <div className="flex items-center gap-1.5 pt-1">
                    {getPriorityBadge(sub.priority)}
                  </div>
                </div>
              </div>
            ))}

            {submittals.length === 0 && (
              <div className="text-center py-12 space-y-3">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto opacity-40" />
                <div>
                  <h5 className="text-xs font-bold text-slate-300">Focus Queue Empty!</h5>
                  <p className="text-[10px] text-slate-500 mt-1">Excellent job! You are caught up with all active priorities.</p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Side: Active item detail */}
        <main className="flex-1 p-8 overflow-y-auto flex flex-col gap-6">
          {activeSubmittal ? (
            <div className="space-y-6">
              {/* Headline Block */}
              <div className="flex justify-between items-start border-b border-slate-900 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-extrabold text-indigo-400 font-mono tracking-wider">{activeSubmittal.category}</span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400">{activeSubmittal.uploadedAt}</span>
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-slate-100">{activeSubmittal.creditName}</h2>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => recordReviewAction("REJECT")}
                    className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-xs font-bold rounded-xl transition-all"
                  >
                    Reject Submittal
                  </button>
                  <button 
                    onClick={() => recordReviewAction("CLARIFICATION")}
                    className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-xs font-bold rounded-xl transition-all"
                  >
                    Request Clarification
                  </button>
                  <button 
                    onClick={() => recordReviewAction("APPROVE")}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20"
                  >
                    Approve Credit
                  </button>
                </div>
              </div>

              {/* Smart Collapse Blocks (Auto-collapsing repetitive / duplicate data) */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Evidence Explorer</h3>

                {/* Duplicates Block */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => toggleSection("duplicates")}
                    className="w-full px-6 py-4 flex items-center justify-between text-xs font-bold text-slate-300 hover:bg-slate-900/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Repetitive & Redundant Documents</span>
                      <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full">
                        {activeSubmittal.duplicatesFound} duplicate matches collapsed
                      </span>
                    </div>
                    {collapsedSections.duplicates ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>

                  {!collapsedSections.duplicates && (
                    <div className="px-6 pb-6 border-t border-slate-900 pt-4 space-y-3 text-xs text-slate-400 leading-relaxed">
                      <p>
                        We flagged {activeSubmittal.duplicatesFound} file(s) in this batch because their contents match documents already validated in prior categories. To save review time, the system has set aside these copies.
                      </p>
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 font-mono text-[10px] text-slate-500">
                        Duplicate Flag: SHA-256 match found in portfolio directory /evidence/lighting/catalog_spec.pdf
                      </div>
                    </div>
                  )}
                </div>

                {/* Previously Approved Block */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => toggleSection("previouslyApproved")}
                    className="w-full px-6 py-4 flex items-center justify-between text-xs font-bold text-slate-300 hover:bg-slate-900/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Previously Certified Framework Files</span>
                      <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full">
                        {activeSubmittal.previousApprovedCount} documents inherited
                      </span>
                    </div>
                    {collapsedSections.previouslyApproved ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>

                  {!collapsedSections.previouslyApproved && (
                    <div className="px-6 pb-6 border-t border-slate-900 pt-4 space-y-3 text-xs text-slate-400 leading-relaxed">
                      <p>
                        These documents were previously reviewed, certified, and lock-signed in earlier credit submittals. You do not need to re-read or audit these files.
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: activeSubmittal.previousApprovedCount }).map((_, i) => (
                          <div key={i} className="p-3 bg-emerald-950/20 border border-emerald-900/20 rounded-xl text-center">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-0.5">VERIFIED</span>
                            <span className="text-[10px] text-slate-400 block font-mono">approved_item_v{i+1}.pdf</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Document Analysis & AI Assist */}
              <div className="grid grid-cols-3 gap-6 pt-4">
                <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Document Summary Notes</h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                    {activeSubmittal.latestNotes}
                  </p>
                  
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex items-start gap-3">
                    <BrainCircuit className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-200">AI Context Builder Assistant</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        To save time, we parsed this batch and extracted catalog numbers, third-party certification stamps, and manufacturer seals. They are fully cross-referenced in your panel suggestions.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right side click-reducer (Quick Response Composer) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">AI One-Click Response</h4>
                  </div>
                  
                  <p className="text-[11px] text-slate-500">
                    AI composed this draft response based on evidence quality. You can edit this directly or double-click to accept and push to queue.
                  </p>

                  <textarea
                    value={aiDraftNote}
                    onChange={(e) => setAiDraftNote(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none font-sans leading-relaxed"
                  />

                  <button 
                    onClick={() => {
                      if (activeSubmittal.priority === "HIGH_CONFIDENCE") {
                        recordReviewAction("APPROVE");
                      } else {
                        recordReviewAction("CLARIFICATION");
                      }
                    }}
                    className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2"
                  >
                    <Send className="w-3 h-3" />
                    Accept and Dispatch
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4 max-w-sm">
                <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
                <div>
                  <h3 className="text-lg font-bold text-slate-200">No active priorities</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Great work! You have completed auditing the urgent queues. Take a walk, stretch, and relax.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
