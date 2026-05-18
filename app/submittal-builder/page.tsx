"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  Layers, 
  ShieldAlert, 
  CheckCircle, 
  HelpCircle, 
  Clock, 
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
  FileCheck,
  Zap,
  Gauge
} from "lucide-react";
import UniversalEvidencePalette from "../../components/evidence/UniversalEvidencePalette";
import { ReusableEvidenceItem } from "../../lib/evidence/evidenceSearchEngine";

interface SubmittalCredit {
  id: string;
  code: string;
  name: string;
  linkedDocuments: string[];
  status: "DRAFT" | "READY" | "RISKY";
  riskDetails?: string;
  approvalProbability: number; // %
  clarificationProb: number; // %
  reviewerComplexity: "LOW" | "MEDIUM" | "HIGH";
}

export default function SubmittalBuilder() {
  const [credits, setCredits] = useState<SubmittalCredit[]>([
    {
      id: "C-101",
      code: "E-C1",
      name: "HVAC Energy Performance Optimization",
      linkedDocuments: ["Daikin_VRV_IV_Specs_Hospital.pdf"],
      status: "READY",
      approvalProbability: 92,
      clarificationProb: 12,
      reviewerComplexity: "LOW"
    },
    {
      id: "C-102",
      code: "MR-C2",
      name: "Tata Recycled Structural Steel Mill Test",
      linkedDocuments: [],
      status: "RISKY",
      riskDetails: "Missing recycled steel composition report or supplier billing manifest.",
      approvalProbability: 38,
      clarificationProb: 78,
      reviewerComplexity: "HIGH"
    },
    {
      id: "C-103",
      code: "IAQ-C3",
      name: "Indoor Air Quality Berger Low-VOC Paint",
      linkedDocuments: ["Berger_Low_VOC_Paint_Certificate.pdf"],
      status: "READY",
      approvalProbability: 84,
      clarificationProb: 24,
      reviewerComplexity: "LOW"
    }
  ]);

  const [selectedCredit, setSelectedCredit] = useState<SubmittalCredit>(credits[1]);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [builderLogs, setBuilderLogs] = useState<string[]>([
    "Submittal Builder workspace initialized successfully.",
    "Integrated standard templates for LEED v4 Green buildings."
  ]);

  const addLog = (msg: string) => {
    setBuilderLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const handleLinkEvidence = (item: ReusableEvidenceItem) => {
    setCredits((prev) => 
      prev.map((c) => {
        if (c.id === selectedCredit.id) {
          const docs = [...c.linkedDocuments];
          if (!docs.includes(item.name)) {
            docs.push(item.name);
          }
          return {
            ...c,
            linkedDocuments: docs,
            status: "READY",
            approvalProbability: 89,
            clarificationProb: 18,
            reviewerComplexity: "LOW"
          };
        }
        return c;
      })
    );
    
    // Also update selectedCredit locally
    setSelectedCredit((prev) => ({
      ...prev,
      linkedDocuments: [...prev.linkedDocuments, item.name],
      status: "READY",
      approvalProbability: 89,
      clarificationProb: 18,
      reviewerComplexity: "LOW"
    }));

    addLog(`Linked reusable evidence "${item.name}" to credit ${selectedCredit.code}`);
    setIsPaletteOpen(false);
  };

  const triggerCloneTemplate = () => {
    addLog("Cloned base Green framework submittal templates successfully.");
  };

  const triggerSupplierNetworkLink = () => {
    addLog("Inherited supplier data sheets automatically into structural credit submittals.");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md px-8 py-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Zero-Friction Submittal Workspace
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
              Dynamic Credit Linking, Bulk Certification Reuse, and Approvals Validation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={triggerCloneTemplate}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-850 rounded-xl text-xs font-bold transition-all"
          >
            Clone Template
          </button>
          
          <button 
            onClick={() => setIsPaletteOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/10"
          >
            <Search className="w-3.5 h-3.5" />
            Open Evidence Palette
          </button>
        </div>
      </header>

      {/* Main Builder Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-4 gap-8 overflow-hidden">
        
        {/* Left Hand: Credit Assembly Workspace (Col span 3) */}
        <section className="col-span-3 space-y-6 overflow-y-auto pr-2">
          
          {/* Workspace Title */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase text-slate-400 tracking-wider">Drag-and-Drop Submittal Assembly</h2>
            <button 
              onClick={triggerSupplierNetworkLink}
              className="text-[10px] text-indigo-400 font-bold hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3 animate-spin-slow" />
              Auto-Link Supplier Network Assets
            </button>
          </div>

          {/* Credits List */}
          <div className="space-y-4">
            {credits.map((c, idx) => (
              <div 
                key={idx}
                onClick={() => setSelectedCredit(c)}
                className={`p-6 bg-slate-900 border rounded-3xl transition-all cursor-pointer flex items-center justify-between group ${
                  selectedCredit.id === c.id 
                    ? "border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)] bg-slate-900" 
                    : "border-slate-850 hover:border-slate-750"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`h-10 w-10 rounded-2xl flex items-center justify-center font-bold text-xs ${
                    c.status === "READY" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                  }`}>
                    {c.code}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 group-hover:text-indigo-400 transition-all">{c.name}</h3>
                    
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-medium">
                      <span>Linked Certificates: <strong>{c.linkedDocuments.length}</strong></span>
                      <span>Review Complexity: <strong>{c.reviewerComplexity}</strong></span>
                    </div>

                    {c.status === "RISKY" && (
                      <p className="text-[10px] text-rose-400 mt-2 font-bold flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        {c.riskDetails}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-black text-slate-500 block">Approval odds</span>
                    <strong className={`text-base font-black ${
                      c.approvalProbability >= 80 ? "text-emerald-400" :
                      c.approvalProbability >= 50 ? "text-amber-400" :
                      "text-rose-400"
                    }`}>{c.approvalProbability}%</strong>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-indigo-400 transition-all" />
                </div>
              </div>
            ))}
          </div>

          {/* AI Evidence Recommendation Card */}
          {selectedCredit && (
            <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-2 text-indigo-400">
                <Sparkles className="w-4 h-4" />
                <h4 className="text-xs font-black uppercase tracking-wider">AI Objections & Evidence Recommendations</h4>
              </div>

              {selectedCredit.linkedDocuments.length === 0 ? (
                <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl flex flex-col gap-3">
                  <p className="text-[11px] text-slate-400 leading-normal">
                    This credit has **0 certificates linked**. Reviewers will immediately trigger clarification loops on incomplete structural materials documentation. 
                  </p>
                  <button 
                    onClick={() => setIsPaletteOpen(true)}
                    className="self-start text-[10px] text-indigo-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Query Tata Recycled Steel Certificates from Universal Evidence Palette
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-2 text-[11px] text-slate-400">
                  <p className="leading-normal font-bold text-emerald-400">
                    ✓ Strong submittal package! Linked evidence contains historical approval records.
                  </p>
                  <p className="leading-normal">
                    Reviewer objection odds are extremely low ({"<15%"}). Verification timeline prediction is stable.
                  </p>
                </div>
              )}
            </div>
          )}

        </section>

        {/* Right Hand: Risk Engine Metrics (Col span 1) */}
        <section className="bg-slate-900 border border-slate-850 rounded-3xl p-6 flex flex-col gap-6">
          <div className="border-b border-slate-850 pb-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <Gauge className="w-4.5 h-4.5" />
              <h3 className="text-xs font-black uppercase tracking-wider">Approval Risk Engine</h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Real-time simulation scores for current packages.</p>
          </div>

          {selectedCredit ? (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              
              <div className="space-y-6">
                {/* 1. Approval odds */}
                <div className="bg-slate-950 p-4 border border-slate-850 rounded-2xl relative overflow-hidden">
                  <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Approval Odds</span>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="text-xl font-black text-slate-200">{selectedCredit.approvalProbability}%</span>
                    <span className="text-[10px] text-slate-500">Likely Pass</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        selectedCredit.approvalProbability >= 80 ? "bg-emerald-500" :
                        selectedCredit.approvalProbability >= 50 ? "bg-amber-500" :
                        "bg-rose-500"
                      }`}
                      style={{ width: `${selectedCredit.approvalProbability}%` }}
                    />
                  </div>
                </div>

                {/* 2. Clarification Odds */}
                <div className="bg-slate-950 p-4 border border-slate-850 rounded-2xl relative overflow-hidden">
                  <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Clarification Odds</span>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="text-xl font-black text-slate-200">{selectedCredit.clarificationProb}%</span>
                    <span className="text-[10px] text-slate-500">Loop Chance</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${selectedCredit.clarificationProb}%` }}
                    />
                  </div>
                </div>

                {/* 3. Reviewer Complexity */}
                <div className="bg-slate-950 p-4 border border-slate-850 rounded-2xl">
                  <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Reviewer Complexity</span>
                  <p className="text-xs font-bold text-slate-200 mt-2 flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      selectedCredit.reviewerComplexity === "LOW" ? "bg-emerald-500" :
                      selectedCredit.reviewerComplexity === "MEDIUM" ? "bg-amber-500" :
                      "bg-rose-500 animate-pulse"
                    }`} />
                    {selectedCredit.reviewerComplexity} COMPLEXITY TARGET
                  </p>
                </div>
              </div>

              {/* Work log */}
              <div className="space-y-2">
                <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Submittal Build Log</span>
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl h-36 overflow-y-auto font-mono text-[9px] text-indigo-400 space-y-1.5 scrollbar-thin">
                  {builderLogs.map((log, idx) => (
                    <p key={idx}>{log}</p>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-slate-500 text-xs">
              Select a submittal credit to activate Approval Risk telemetry.
            </div>
          )}
        </section>

      </main>

      {/* Universal Evidence Palette */}
      <UniversalEvidencePalette 
        tenantId="tenant-alpha"
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onLinkEvidence={handleLinkEvidence}
      />
    </div>
  );
}
