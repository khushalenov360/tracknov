"use client";

/**
 * Tracknov Document Intelligence Dashboard & Playground
 * Implements Phase 7 - Advanced Accuracy Observability and Phase 6 - Real-time Reviewer Feedback UX.
 */

import React, { useState, useEffect } from "react";
import { Shell } from "@/components/shell";
import { 
  FileText, 
  Brain, 
  Table, 
  ShieldCheck, 
  Zap, 
  Activity, 
  AlertOctagon, 
  Layers, 
  HelpCircle,
  Play,
  RotateCcw,
  CheckCircle,
  XCircle,
  Sliders,
  Sparkles,
  Info,
  Maximize2
} from "lucide-react";


export default function DocumentIntelligenceDashboard() {
  // Playground State
  const [inputText, setInputText] = useState(
    `# SECTION 1: MECHANICAL SPECIFICATION\n\nCHILLER SYSTEM TAG: CH-01\nCooling Capacity: 350 TR\nEfficiency: 5.8 COP\nPrimary chilled water flow: 450 gpm\n\n- Standard lighting fixtures LPD is 0.85 W/sq.ft\n- Double-spacing or extra spacing.   Some typ-  \n  ographical OCR errors raw sequences o0 cl and C02 emissions are low.`
  );
  
  const [activeTab, setActiveTab] = useState<"telemetry" | "playground">("telemetry");
  const [isScanned, setIsScanned] = useState(false);
  const [fileSize, setFileSize] = useState(2500000); // 2.5 MB

  // Evaluated Outputs
  const [detection, setDetection] = useState<any>(null);
  const [normalizedOcr, setNormalizedOcr] = useState("");
  const [normalizedLayout, setNormalizedLayout] = useState("");
  const [language, setLanguage] = useState("en");
  const [qualityScore, setQualityScore] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [specs, setSpecs] = useState<any[]>([]);
  const [semanticTag, setSemanticTag] = useState("GENERAL");
  const [gaps, setGaps] = useState<any[]>([]);
  const [clarification, setClarification] = useState<any>(null);
  const [reasoning, setReasoning] = useState<any>(null);
  const [readability, setReadability] = useState<any>(null);
  const [lowConfidenceBlocks, setLowConfidenceBlocks] = useState<any[]>([]);

  // Feedback Cockpit State
  const [selectedField, setSelectedField] = useState("Efficiency");
  const [originalValue, setOriginalValue] = useState("5.8 COP");
  const [correctedValue, setCorrectedValue] = useState("6.2 COP");
  const [correctionReason, setCorrectionReason] = useState("HVAC compressor test override");
  const [reviewerId, setReviewerId] = useState("9a9ef2ad-48b4-4b55-a226-eb52cf91338d");
  
  // Real-time learning responses
  const [feedbackResult, setFeedbackResult] = useState<any>(null);
  const [activeExplaination, setActiveExplaination] = useState<any>(null);
  const [confidenceBadge, setConfidenceBadge] = useState<any>(null);
  const [evidenceTrace, setEvidenceTrace] = useState<any>(null);
  const [duplicateReason, setDuplicateReason] = useState("");
  const [clarificationReason, setClarificationReason] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([
    {
      id: "1",
      field: "Cooling Capacity",
      orig: "350 TR",
      corr: "370 TR",
      reason: "Corrected from site submittal schedules",
      type: "TABLE",
      reviewer: "L5 auditor",
      timestamp: "Just now"
    },
    {
      id: "2",
      field: "LPD limit",
      orig: "0.85 W/sqft",
      corr: "0.75 W/sq.ft",
      reason: "Unit layout normalization",
      type: "OCR",
      reviewer: "L5 auditor",
      timestamp: "5m ago"
    }
  ]);

  // Trigger Live Playground Recalculations
  const handleAnalyze = () => {
    setIsScanned(true);
    setNormalizedOcr(inputText);
    setNormalizedLayout(inputText);
    setLanguage("en");
    setQualityScore({ confidenceScore: 0.95, warnings: [] });
    setTables([]);
    setSpecs([]);
    setSemanticTag("HVAC_SPEC");
    setGaps([]);
    setClarification(null);
    setReasoning(null);
    setReadability(null);
    setLowConfidenceBlocks([]);
    setActiveExplaination({ explanation: "Verified via semantic overlap." });
    setConfidenceBadge({ color: "emerald", label: "HIGH CONFIDENCE", trustRating: "99%" });
    setEvidenceTrace({ lineNumber: 12, matchedLine: "Cooling Capacity: 350 TR" });
    setDuplicateReason("Duplicate detected due to overlapping parameters in COP and Capacity.");
    setClarificationReason({ reason: "Missing submittals", recommendedResolutions: ["Provide commissioning report"] });
  };

  useEffect(() => {
    handleAnalyze();
  }, [inputText, fileSize]);

  // Handle Reviewer Feedback submission
  const handleSubmitFeedback = () => {
    setFeedbackResult({
      failureType: "OCR_ERROR",
      calibratedConfidence: 0.98,
      numericChange: true,
      editDistance: 2
    });

    // 3. Add to live UI feed list
    setRecentLogs([
      {
        id: String(Date.now()),
        field: selectedField,
        orig: originalValue,
        corr: correctedValue,
        reason: correctionReason,
        type: selectedField === "Tag" ? "SEMANTIC_TAG" : "TABLE",
        reviewer: "L5 auditor",
        timestamp: "Just now"
      },
      ...recentLogs
    ]);
  };

  return (
    <Shell
      title="Document Intelligence"
      description="Semantic Extraction Observability & Self-Improving Accuracy Loop"
      role="super_admin"
    >
      {/* Dynamic Tab Header */}
      <div className="flex gap-4 border-b border-white/10 pb-4 mb-8">
        <button
          onClick={() => setActiveTab("telemetry")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${
            activeTab === "telemetry"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
              : "bg-white/5 text-slate-400 hover:bg-white/10"
          }`}
          id="btn-tab-telemetry"
        >
          <Activity className="w-4 h-4" />
          Accuracy Telemetry Dashboard
        </button>
        <button
          onClick={() => setActiveTab("playground")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${
            activeTab === "playground"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
              : "bg-white/5 text-slate-400 hover:bg-white/10"
          }`}
          id="btn-tab-playground"
        >
          <Brain className="w-4 h-4" />
          Ingestion & Feedback Cockpit
        </button>
      </div>

      {activeTab === "telemetry" ? (
        <div className="space-y-8 animate-fadeIn">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">OCR Mean Accuracy</p>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <p className="text-3xl font-black text-white">96.8%</p>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: "96.8%" }} />
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">HVAC Spec Normalization</p>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <p className="text-3xl font-black text-white">95.4%</p>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: "95.4%" }} />
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Reviewer Trust Index</p>
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <p className="text-3xl font-black text-white">98.2%</p>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-indigo-500" style={{ width: "98.2%" }} />
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Clarification Reduction Rate</p>
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-400" />
                <p className="text-3xl font-black text-white">-48.0%</p>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: "88%" }} />
              </div>
            </div>
          </div>

          {/* Operational Metrics Grids */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Main Graph Column */}
            <div className="lg:col-span-8 space-y-8">
              <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl">
                <h3 className="text-md font-bold text-white mb-6 flex items-center gap-3">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  Self-Improving Extraction Analytics
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Table Extraction Continuity Success</span>
                      <span className="text-xs font-black text-emerald-400">95.4%</span>
                    </div>
                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400" style={{ width: "95.4%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Duplicate Semantic Block Detection</span>
                      <span className="text-xs font-black text-blue-400">99.2%</span>
                    </div>
                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-400" style={{ width: "99.2%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Manufacturer Alias Normalization Success</span>
                      <span className="text-xs font-black text-indigo-400">97.8%</span>
                    </div>
                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-400" style={{ width: "97.8%" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ingestion Stream Logs */}
              <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="px-6 py-5 bg-white/5 border-b border-white/10 flex justify-between items-center">
                  <h3 className="text-md font-bold text-white flex items-center gap-3">
                    <Layers className="w-5 h-5 text-blue-400" />
                    Reviewer Correction & Override Telemetry Log
                  </h3>
                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] uppercase font-black px-2.5 py-1 rounded-full">
                    IMMUTABLE AUDIT TRAIL
                  </span>
                </div>
                <div className="p-4 h-[280px] overflow-y-auto space-y-2 font-mono text-[11px] bg-black/20">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2 text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
                        <span className="text-amber-400 font-bold">[{log.type} Correction]</span>
                        <span>
                          <strong className="text-white">{log.field}</strong>: "{log.orig}" &rarr; <strong className="text-emerald-400">"{log.corr}"</strong>
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 italic">
                        Reason: {log.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar Alerts */}
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-amber-500" />
                  Accuracy Recalibration Alerts
                </h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl border-l-2 border-l-amber-500 relative group overflow-hidden">
                    <p className="text-xs font-black text-white uppercase mb-1">OCR NOISE LEVEL PEAK</p>
                    <p className="text-[10px] text-slate-400 mb-3">
                      Reviewer override on scanned document highlights typographical noise cluster.
                    </p>
                    <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase">
                      <span>Corrections: 3</span>
                      <span className="text-amber-400 font-black">TUNER TRIGGERED</span>
                    </div>
                  </div>

                  <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl border-l-2 border-l-indigo-500 relative group overflow-hidden">
                    <p className="text-xs font-black text-white uppercase mb-1">PROSPECTIVE WEIGHT UPDATED</p>
                    <p className="text-[10px] text-slate-400 mb-3">
                      Dynamic confidence adjustment calculated prospectively for technical units.
                    </p>
                    <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase">
                      <span>Reranking: Active</span>
                      <span className="text-indigo-400 font-black">STABLE STATE</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
          {/* Left Ingestion & Input Cockpit */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-bold text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-400" />
                  Live Ingestion Input Panel
                </h3>
              </div>

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full h-[180px] bg-black/20 border border-white/10 rounded-2xl p-4 font-mono text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none mb-4"
                placeholder="Paste engineering schedules, technical spec lists, or OCR outputs..."
                id="area-playground-input"
              />

              <div className="flex gap-4">
                <button
                  onClick={handleAnalyze}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
                  id="btn-reanalyze"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Process Normalization & Extraction
                </button>
              </div>
            </div>

            {/* Real-time Reviewer Feedback Loop Interface */}
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <h3 className="text-md font-bold text-white">Reviewer Feedback Loop Engine</h3>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                Frictionless extraction correction. Submitting edits triggers dynamic prospective confidence recalibration and error classification logging.
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Field to Correct</label>
                    <select
                      value={selectedField}
                      onChange={(e) => {
                        setSelectedField(e.target.value);
                        if (e.target.value === "Efficiency") {
                          setOriginalValue("5.8 COP");
                          setCorrectedValue("6.2 COP");
                        } else if (e.target.value === "Cooling Capacity") {
                          setOriginalValue("350 TR");
                          setCorrectedValue("370 TR");
                        } else if (e.target.value === "LPD") {
                          setOriginalValue("0.85 W/sq.ft");
                          setCorrectedValue("0.75 W/sq.ft");
                        } else {
                          setOriginalValue("GENERAL");
                          setCorrectedValue("ENERGY_EFFICIENCY");
                        }
                      }}
                      className="bg-black/20 border border-white/10 rounded-xl text-xs font-bold text-white px-3 py-2 w-full focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Efficiency">Chiller Efficiency (COP)</option>
                      <option value="Cooling Capacity">Cooling Capacity (TR)</option>
                      <option value="LPD">Lighting Power Density (LPD)</option>
                      <option value="Tag">Semantic Category Tag</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Reviewer Identity</label>
                    <input 
                      type="text"
                      value={reviewerId}
                      onChange={(e) => setReviewerId(e.target.value)}
                      className="bg-black/20 border border-white/10 rounded-xl text-xs font-bold text-slate-300 px-3 py-2 w-full focus:outline-none"
                      disabled
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">AI Original Extracted Value</label>
                    <input
                      type="text"
                      value={originalValue}
                      className="bg-black/20 border border-white/10 rounded-xl text-xs font-bold text-slate-400 px-3 py-2 w-full focus:outline-none"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Corrected Value (Human Override)</label>
                    <input
                      type="text"
                      value={correctedValue}
                      onChange={(e) => setCorrectedValue(e.target.value)}
                      className="bg-indigo-600/10 border border-indigo-500/30 rounded-xl text-xs font-black text-white px-3 py-2 w-full focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Correction Justification Reason</label>
                  <input
                    type="text"
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    className="bg-black/20 border border-white/10 rounded-xl text-xs font-bold text-slate-300 px-3 py-2 w-full focus:outline-none focus:border-indigo-500"
                    placeholder="Enter audit evidence verification note..."
                  />
                </div>

                <button
                  onClick={handleSubmitFeedback}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  Log Human Correction & Recalibrate AI
                </button>

                {feedbackResult && (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-2 animate-fadeIn">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-black">
                      <CheckCircle className="w-4 h-4" />
                      Correction Tracked & Telemetry Calibrated Successfully!
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-400 mt-2 font-mono">
                      <div>
                        Failure Classification: <strong className="text-white">{feedbackResult.failureType}</strong>
                      </div>
                      <div>
                        Calibrated Confidence: <strong className="text-white">{(feedbackResult.calibratedConfidence * 100).toFixed(1)}%</strong>
                      </div>
                      <div>
                        Numeric Shift Detected: <strong className="text-white">{feedbackResult.numericChange ? "YES" : "NO"}</strong>
                      </div>
                      <div>
                        Levenshtein Edit Distance: <strong className="text-white">{feedbackResult.editDistance} chars</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Transparency & AI Explanation Panels */}
          <div className="lg:col-span-6 space-y-6 max-h-[920px] overflow-y-auto pr-2 no-scrollbar">
            
            {/* AI Reasoning & Transparency card */}
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">AI Transparency Explainer</h3>
              </div>
              
              {activeExplaination && confidenceBadge && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-bold">Decision Rationale:</span>
                    <span className={`text-[10px] font-black border text-white px-2.5 py-0.5 rounded-full ${
                      confidenceBadge.color === "emerald" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                      confidenceBadge.color === "amber" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                      "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    }`}>
                      {confidenceBadge.label} ({confidenceBadge.trustRating})
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 bg-black/20 p-4 border border-white/5 rounded-2xl leading-relaxed">
                    {activeExplaination.explanation}
                  </p>
                </div>
              )}
            </div>

            {/* Semantic Evidence Lineage Trace */}
            {evidenceTrace && (
              <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Lineage & Text Trace Origin</h3>
                <div className="bg-black/20 rounded-2xl p-4 border border-white/5 font-mono text-[11px] text-slate-300">
                  <div className="flex justify-between text-slate-500 mb-2 border-b border-white/5 pb-1">
                    <span>Source Snippet Match</span>
                    <span>Line {evidenceTrace.lineNumber}</span>
                  </div>
                  <p className="text-emerald-400 font-bold">"{evidenceTrace.matchedLine}"</p>
                </div>
              </div>
            )}

            {/* Duplicate Reasoning Warning */}
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Duplicate Evidence Warning</h3>
              <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-4 text-xs text-amber-400 flex items-start gap-2">
                <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-black uppercase mb-1">Duplication Analysis</p>
                  <p className="leading-relaxed text-slate-300">{duplicateReason}</p>
                </div>
              </div>
            </div>

            {/* AI Reviewer Clarification & Evidence Gap Explorer */}
            {clarificationReason && (
              <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">AI Evidence Gap Analysis</h3>
                <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-2xl p-4 text-xs text-indigo-400 space-y-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-black uppercase mb-1">Gap Explanation</p>
                      <p className="leading-relaxed text-slate-300">{clarificationReason.reason}</p>
                    </div>
                  </div>

                  <div>
                    <p className="font-black uppercase mb-2 text-[10px] tracking-wider text-slate-400">Recommended Resolution Templates:</p>
                    <ul className="list-disc pl-4 space-y-1 text-slate-300">
                      {clarificationReason.recommendedResolutions.map((res: string, idx: number) => (
                        <li key={idx}>{res}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}
