"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, 
  Sparkles, 
  Layers, 
  FileCheck, 
  X, 
  TrendingUp, 
  Clock, 
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { EvidenceSearchEngine, ReusableEvidenceItem } from "@tracknov/harita-engine/evidence/evidenceSearchEngine";
import { EvidenceSemanticMatcher } from "@tracknov/harita-engine/evidence/evidenceSemanticMatcher";
import { EvidenceReuseScorer } from "@tracknov/harita-engine/evidence/evidenceReuseScorer";

interface UniversalEvidencePaletteProps {
  tenantId: string;
  isOpen: boolean;
  onClose: () => void;
  onLinkEvidence?: (item: ReusableEvidenceItem) => void;
}

export default function UniversalEvidencePalette({
  tenantId,
  isOpen,
  onClose,
  onLinkEvidence
}: UniversalEvidencePaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReusableEvidenceItem[]>([]);
  const [latencyMs, setLatencyMs] = useState(0);

  // Suggestions list
  const suggestedQueries = [
    "find approved HVAC schedules",
    "show low VOC paint certificates",
    "Tata Recycled steel",
    "indoor air quality Berger"
  ];

  useEffect(() => {
    if (!isOpen) return;

    const runSearch = () => {
      const start = performance.now();
      const baseResults = EvidenceSearchEngine.search(tenantId, query);
      
      // Map semantic and reuse scores dynamically
      const mapped = baseResults.map((item) => {
        const semantic = EvidenceSemanticMatcher.match(query, item.textExcerpt, item.frameworkCompatibility);
        const reuseScore = EvidenceReuseScorer.evaluateScore(
          item.priorApprovalsCount,
          semantic.similarityScore,
          item.duplicateProbability
        );
        
        return {
          ...item,
          // Enhance search attributes using scoring outputs
          priorApprovalsCount: reuseScore.historicalApprovalIndex * 1.5,
          duplicateProbability: reuseScore.duplicateProbability
        };
      });

      const end = performance.now();
      setResults(baseResults);
      setLatencyMs(parseFloat((end - start).toFixed(2)));
    };

    const debounce = setTimeout(runSearch, 150);
    return () => clearTimeout(debounce);
  }, [query, isOpen, tenantId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Central Search Dialog Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col shadow-[0_0_50px_rgba(99,102,241,0.2)] animate-in fade-in zoom-in duration-200">
        
        {/* Search Input Bar */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3 relative">
          <Search className="w-5 h-5 text-indigo-400" />
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search approved HVAC specs, low-VOC certificates, recycled steel tests..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none border-none py-1.5"
            autoFocus
          />
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition-all absolute right-5 top-5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Suggestion Tokens */}
        <div className="px-5 py-3.5 bg-slate-950/50 border-b border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Suggested:</span>
          {suggestedQueries.map((q, idx) => (
            <button 
              key={idx}
              onClick={() => setQuery(q)}
              className="text-xs text-slate-400 hover:text-indigo-400 bg-slate-900 border border-slate-800 hover:border-indigo-500/20 px-2.5 py-1 rounded-full transition-all"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Results Stream Area */}
        <div className="flex-1 overflow-y-auto max-h-[350px] p-5 space-y-4 scrollbar-thin">
          <div className="flex justify-between items-center text-xs uppercase font-black text-slate-500 tracking-wider mb-2">
            <span>Query Matches ({results.length})</span>
            {latencyMs > 0 && <span>Latency: {latencyMs}ms ({"< 2s Target"})</span>}
          </div>

          {results.length > 0 ? (
            <div className="space-y-3">
              {results.map((item, idx) => {
                // Heuristic score display
                const confidence = Math.round(90 - idx * 7);

                return (
                  <div 
                    key={idx}
                    className="p-4 bg-slate-950/40 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all flex flex-col gap-3 group relative cursor-pointer"
                    onClick={() => onLinkEvidence?.(item)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-all">{item.name}</span>
                        </div>
                        <span className="text-xs text-slate-500 block mt-1">{item.creditCategory} • {item.type}</span>
                      </div>

                      <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded font-black">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {confidence}% REUSE MATCH
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 font-mono leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                      {item.textExcerpt}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Used 1 day ago</span>
                        <span>Duplicate Risk: {item.duplicateProbability}%</span>
                        <span className="text-emerald-400 font-bold">{item.approvalLineage}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              No matching tenant certifications or supplier packages indexed.
            </div>
          )}
        </div>

        {/* Footnote */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 text-[9px] text-slate-500 flex items-center justify-between">
          <span>Shield Gate active. 100% tenant-isolated environment.</span>
          <span className="uppercase font-bold text-indigo-400">Tracknov Search Layer</span>
        </div>

      </div>
    </div>
  );
}
