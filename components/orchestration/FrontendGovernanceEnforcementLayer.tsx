"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { 
  Sparkles, 
  AlertTriangle, 
  Activity, 
  CheckCircle, 
  Eye, 
  EyeOff, 
  Cpu, 
  FileText, 
  HelpCircle,
  TrendingUp,
  X,
  Sliders,
  ChevronRight,
  Smartphone,
  Layout,
  Gauge
} from "lucide-react";
import { 
  DEFAULT_FGEL_CONFIG, 
  CognitiveLoadGovernor, 
  ScrollDepthGovernor, 
  OperationalRenderingGovernor, 
  MobileGovernanceGovernor, 
  HierarchyLeakageDetector, 
  DuplicateRenderingDetector, 
  CopilotVisibilityGovernor, 
  AIGovernanceRecommendationEngine, 
  FrontendGovernanceScore, 
  entropyMonitor, 
  FGELViolation, 
  GovernanceScoreBreakdown 
} from "@/lib/governance/fgel";

export function FrontendGovernanceEnforcementLayer() {
  const pathname = usePathname();
  
  // HUD toggles & active telemetry states
  const [isOpen, setIsOpen] = useState(false);
  const [showHud, setShowHud] = useState(false);
  const [violations, setViolations] = useState<FGELViolation[]>([]);
  const [score, setScore] = useState<GovernanceScoreBreakdown | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "violations" | "telemetry" | "config">("summary");
  
  // Live DOM elements collected for highlight overlays
  const [domStats, setDomStats] = useState({
    sections: 0,
    projects: 0,
    actions: 0,
    scrollHeightVh: 0,
    cardsCount: 0
  });

  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Perform full DOM scan
  const performDOMScan = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    // 1. Gather document metrics
    const sections = document.querySelectorAll("section, main, aside, [role='region']");
    const projects = document.querySelectorAll(".project-card, [data-project-id], [href*='/projects/']");
    const actions = document.querySelectorAll("button, [role='button'], input[type='submit']");
    const cards = document.querySelectorAll(".surface-card, .surface-muted, .bg-slate-900, .bg-slate-950");
    const pageText = document.body.innerText || "";
    
    // Task counters per project block
    const tasksPerProject: Record<string, number> = {};
    projects.forEach((projEl, idx) => {
      const parent = projEl.closest("div") || projEl;
      const tasks = parent.querySelectorAll("li, [role='listitem']").length;
      tasksPerProject[`proj-${idx}`] = tasks;
    });

    const scrollHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    const scrollHeightVh = (scrollHeight / (viewportHeight || 1)) * 100;

    const currentStats = {
      sections: sections.length,
      projects: projects.length,
      actions: actions.length,
      scrollHeightVh,
      cardsCount: cards.length
    };

    setDomStats(currentStats);

    // 2. Map elements to detect duplicate rendering
    const elementsToValidate: Array<{ id: string; className: string; textContent: string }> = [];
    cards.forEach((cardEl, idx) => {
      elementsToValidate.push({
        id: cardEl.id || `card-${idx}`,
        className: cardEl.className || "",
        textContent: cardEl.textContent || ""
      });
    });

    // 3. Evaluate compliance violations via Governors
    let activeViolations: FGELViolation[] = [];
    const isMobile = window.innerWidth < 1024;

    // Cognitive load
    activeViolations = activeViolations.concat(
      CognitiveLoadGovernor.analyze({
        sections: currentStats.sections,
        projects: currentStats.projects,
        tasksPerProject,
        actions: currentStats.actions
      }, DEFAULT_FGEL_CONFIG)
    );

    // Scroll depth
    activeViolations = activeViolations.concat(
      ScrollDepthGovernor.check({ scrollHeight, viewportHeight }, isMobile, DEFAULT_FGEL_CONFIG)
    );

    // Density
    activeViolations = activeViolations.concat(
      OperationalRenderingGovernor.checkDensity({
        textDensityWords: pageText.split(/\s+/).length,
        cardsCount: currentStats.cardsCount
      })
    );

    // Mobile layout
    if (isMobile) {
      const bottomNav = document.querySelector("nav.fixed.bottom-0") !== null;
      activeViolations = activeViolations.concat(
        MobileGovernanceGovernor.checkMobile({
          cards: currentStats.cardsCount,
          sections: currentStats.sections,
          hasBottomNav: bottomNav,
          scrollHeightVh
        }, DEFAULT_FGEL_CONFIG)
      );
    }

    // Hierarchy Leakage
    activeViolations = activeViolations.concat(
      HierarchyLeakageDetector.detect(pageText)
    );

    // Duplicate rendering
    activeViolations = activeViolations.concat(
      DuplicateRenderingDetector.detect(elementsToValidate)
    );

    // Copilot Persistence & Visibility
    const hasCopilot = document.querySelector("aside select, aside input, aside textarea, [aria-label*='Harita']") !== null 
      || pageText.includes("Harita") || pageText.includes("Ask Harita");
    const isPersistent = document.querySelector("aside") !== null;
    activeViolations = activeViolations.concat(
      CopilotVisibilityGovernor.checkVisibility(hasCopilot, isPersistent, !isMobile)
    );

    setViolations(activeViolations);

    // Calculate score
    const computedScore = FrontendGovernanceScore.calculate(activeViolations, currentStats, isMobile);
    setScore(computedScore);

    // Record trends
    entropyMonitor.record(computedScore.overallScore, activeViolations.length);
  };

  // Setup periodic monitoring
  useEffect(() => {
    // Scan immediately after mount & transition
    performDOMScan();

    // Debounced scan with mutation observer
    const observer = new MutationObserver((mutations) => {
      const hasRealMutation = mutations.some((m) => {
        const target = m.target as HTMLElement;
        if (!target) return false;
        
        // Ignore mutations on FGEL panels, HUD badges, and drawer widgets
        if (
          target.closest?.('[data-fgel-ignore="true"]') ||
          target.closest?.('.fgel-hud-badge') ||
          (typeof target.className === 'string' && target.className.includes('fgel')) ||
          (target.id && target.id.includes('fgel'))
        ) {
          return false;
        }
        return true;
      });

      if (!hasRealMutation) return;

      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      scanTimerRef.current = setTimeout(performDOMScan, 800);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Watch resize
    window.addEventListener("resize", performDOMScan);

    // Hotkey toggle: Ctrl+Shift+G
    const handleHotkey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleHotkey);

    return () => {
      observer.disconnect();
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      window.removeEventListener("resize", performDOMScan);
      window.removeEventListener("keydown", handleHotkey);
    };
  }, [pathname]);

  // Apply inline HUD styling overlay when HUD is toggled on
  useEffect(() => {
    if (typeof document === "undefined") return;

    const cards = document.querySelectorAll(".surface-card, .surface-muted, .bg-slate-900, .bg-slate-950");
    const sections = document.querySelectorAll("section, main, aside, [role='region']");
    
    if (showHud) {
      // Highlight high density/violations visually
      cards.forEach((card, idx) => {
        const el = card as HTMLElement;
        el.style.border = "1px solid rgba(220, 38, 38, 0.4)";
        el.style.position = "relative";
        
        let overlay = el.querySelector(".fgel-hud-badge");
        if (!overlay) {
          overlay = document.createElement("div");
          overlay.className = "fgel-hud-badge";
          overlay.setAttribute("style", "position: absolute; top: 4px; right: 4px; font-size: 8px; font-family: monospace; background: #dc2626; color: white; padding: 2px 4px; border-radius: 4px; z-index: 10; pointer-events: none;");
          overlay.textContent = `FGEL CARD #${idx + 1}`;
          el.appendChild(overlay);
        }
      });

      sections.forEach((sec, idx) => {
        const el = sec as HTMLElement;
        el.style.boxShadow = "inset 0 0 10px rgba(245, 158, 11, 0.15)";
      });
    } else {
      // Reset
      cards.forEach((card) => {
        const el = card as HTMLElement;
        el.style.border = "";
        const overlay = el.querySelector(".fgel-hud-badge");
        if (overlay) overlay.remove();
      });

      sections.forEach((sec) => {
        const el = sec as HTMLElement;
        el.style.boxShadow = "";
      });
    }
  }, [showHud, violations]);

  // Toggle debug console
  const toggleDashboard = () => setIsOpen(!isOpen);

  // Helper color map
  const getScoreColor = (val: number) => {
    if (val >= 80) return "text-emerald-400 border-emerald-500/20 bg-emerald-950/20";
    if (val >= 50) return "text-amber-400 border-amber-500/20 bg-amber-950/20";
    return "text-rose-400 border-rose-500/20 bg-rose-950/20";
  };

  const getSeverityIcon = (sev: "info" | "warning" | "critical") => {
    switch (sev) {
      case "critical": return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return <HelpCircle className="w-4 h-4 text-sky-400" />;
    }
  };

  const cleanRecommendations = AIGovernanceRecommendationEngine.generate(violations);

  return (
    <>
      {/* Floating tiny pill in bottom-right corner for developers */}
      <div data-fgel-ignore="true" className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
        <button
          onClick={toggleDashboard}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-lg backdrop-blur-md transition-all duration-300 font-sans font-bold text-[10px] ${
            score && score.overallScore >= 80 
              ? "bg-slate-900/90 border-emerald-500/30 text-emerald-400 hover:border-emerald-500/50 shadow-emerald-950/20" 
              : "bg-slate-900/90 border-amber-500/30 text-amber-400 hover:border-amber-500/50 shadow-amber-950/20"
          }`}
          title="Toggle FGEL Developer Dashboard (Ctrl+Shift+G)"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
          <span>FGEL ACTIVE</span>
          <span className="h-4 w-px bg-slate-800" />
          <span className="mono font-black">{score?.overallScore ?? 100}%</span>
        </button>
      </div>

      {/* Slide-out Premium Admin/Developer Dashboard drawer */}
      {isOpen && (
        <div data-fgel-ignore="true" className="fixed inset-y-0 right-0 z-50 w-[420px] bg-slate-950 border-l border-slate-900 shadow-2xl flex flex-col font-sans text-slate-200 animate-in slide-in-from-right duration-300">
          {/* Header */}
          <header className="px-5 py-4 border-b border-slate-900 bg-slate-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/25 rounded-lg text-indigo-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black tracking-wider uppercase bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Frontend Governance
                </h3>
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                  Tracknov FGEL Telemetry v1.1
                </p>
              </div>
            </div>
            <button
              onClick={toggleDashboard}
              className="p-1 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          {/* Navigation tabs */}
          <nav className="flex border-b border-slate-900 bg-slate-900/10 text-[10px] font-bold uppercase tracking-wider shrink-0">
            {[
              { id: "summary", label: "Health Score" },
              { id: "violations", label: `Violations (${violations.length})` },
              { id: "telemetry", label: "Telemetry" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 text-center transition-all ${
                  activeTab === tab.id 
                    ? "text-indigo-400 border-b-2 border-indigo-500 bg-indigo-950/10" 
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Body content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* TAB 1: HEALTH SUMMARY */}
            {activeTab === "summary" && score && (
              <div className="space-y-6">
                
                {/* Circular overall score chart representation */}
                <div className="flex items-center gap-5 p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-900 rounded-2xl">
                  <div className="relative flex items-center justify-center shrink-0">
                    <svg className="w-20 h-20 transform -rotate-95">
                      <circle cx="40" cy="40" r="34" className="stroke-slate-800" strokeWidth="6" fill="transparent" />
                      <circle 
                        cx="40" 
                        cy="40" 
                        r="34" 
                        className={score.overallScore >= 80 ? "stroke-emerald-500" : score.overallScore >= 50 ? "stroke-amber-500" : "stroke-rose-500"} 
                        strokeWidth="6" 
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 34}
                        strokeDashoffset={2 * Math.PI * 34 * (1 - score.overallScore / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-base font-black tracking-tighter text-slate-100 mono">
                      {score.overallScore}%
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-200">System UX Quality Score</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Enforces non-ERP cognitive abstract layers. Current score indicates {
                        score.overallScore >= 80 ? "satisfactory alignment" : "mild visual entropy issues"
                      }.
                    </p>
                  </div>
                </div>

                {/* Score parameters breakdown */}
                <div className="space-y-3.5">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-500">Governance Breakdown</h4>
                  
                  {[
                    { label: "Cognitive Load Governor", val: score.cognitiveLoad },
                    { label: "Scroll Depth Governor", val: score.scrollHealth },
                    { label: "Hierarchy Leakage Detector", val: score.hierarchyLeakage },
                    { label: "Duplicate Rendering Detector", val: score.duplicateRendering },
                    { label: "Mobile Compliance Governor", val: score.mobileCompliance },
                    { label: "Operational Intent Quality", val: score.operationalFocus },
                    { label: "AI Compression Ratio", val: score.aiCompressionCompliance },
                    { label: "Copilot Visibility Rule", val: score.copilotVisibility },
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-300">{item.label}</span>
                        <span className="mono text-slate-400">{item.val}%</span>
                      </div>
                      <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.val >= 80 ? "bg-emerald-500" : item.val >= 50 ? "bg-amber-500" : "bg-rose-500"
                          }`}
                          style={{ width: `${item.val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Inline interactive tools */}
                <div className="p-4 bg-slate-900/50 border border-slate-900 rounded-xl space-y-3">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-500">Interactive Diagnostics</h4>
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-slate-300 font-bold">Dev HUD Highlights Overlay</span>
                    </div>
                    <button
                      onClick={() => setShowHud(prev => !prev)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        showHud 
                          ? "bg-rose-500/20 border-rose-500 text-rose-400 hover:bg-rose-500/30" 
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      {showHud ? "Deactivate HUD" : "Activate HUD"}
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: VIOLATIONS & DYNAMIC ADVICE */}
            {activeTab === "violations" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-500">Active Warning Signals</h4>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-900 border border-slate-800 text-slate-400">
                    {violations.length} Detected
                  </span>
                </div>

                {violations.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/20 border border-slate-900 rounded-2xl space-y-3">
                    <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-300">Clean Governance State</h4>
                      <p className="text-[10px] text-slate-500 mt-1 max-w-[240px] mx-auto leading-relaxed">
                        Tracknov is perfectly abstract and execution-centric. No clutter detected.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {violations.map((violation) => (
                      <div 
                        key={violation.id} 
                        className={`p-4 rounded-xl border space-y-2 flex gap-3 ${
                          violation.severity === "critical" 
                            ? "bg-rose-950/10 border-rose-900/30 text-rose-300"
                            : violation.severity === "warning"
                            ? "bg-amber-950/10 border-amber-900/30 text-amber-300"
                            : "bg-sky-950/10 border-sky-900/30 text-sky-300"
                        }`}
                      >
                        <div className="shrink-0 mt-0.5">
                          {getSeverityIcon(violation.severity)}
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-bold text-slate-200 leading-tight">
                            {violation.message}
                          </p>
                          <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                            <span className="font-bold text-indigo-400/90 uppercase text-[9px] tracking-wider block mb-0.5">AI Corrective Suggestion:</span>
                            {violation.recommendation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Recommendation panel */}
                {violations.length > 0 && (
                  <div className="p-4 bg-indigo-950/10 border border-indigo-900/20 rounded-xl space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-indigo-300">Harita AI-Native UX Advice</h4>
                    </div>
                    <ul className="space-y-1.5 pl-1">
                      {cleanRecommendations.slice(0, 3).map((rec, idx) => (
                        <li key={idx} className="text-[10px] text-slate-300 leading-relaxed flex items-start gap-1.5">
                          <ChevronRight className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: REAL-TIME DOM METRICS */}
            {activeTab === "telemetry" && (
              <div className="space-y-5">
                <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-500">Live Rendering Telemetry</h4>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Visible Sections", val: domStats.sections, target: "< 4", status: domStats.sections <= 4 },
                    { label: "Active Project Links", val: domStats.projects, target: "< 5", status: domStats.projects <= 5 },
                    { label: "Interactive Actions", val: domStats.actions, target: "< 3", status: domStats.actions <= 3 },
                    { label: "Scroll Height (vh)", val: `${Math.round(domStats.scrollHeightVh)}vh`, target: "< 100vh", status: domStats.scrollHeightVh <= 100 },
                    { label: "Total Widget Cards", val: domStats.cardsCount, target: "< 10", status: domStats.cardsCount <= 10 },
                  ].map((stat, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-900/60 border border-slate-900 rounded-xl space-y-1">
                      <span className="text-[9px] font-black uppercase text-slate-500 block">{stat.label}</span>
                      <div className="flex justify-between items-baseline pt-0.5">
                        <span className="text-sm font-black mono text-slate-200">{stat.val}</span>
                        <span className={`text-[8px] font-mono uppercase font-bold px-1.5 py-0.5 rounded ${
                          stat.status ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/20" : "bg-rose-950/40 text-rose-400 border border-rose-900/20"
                        }`}>
                          {stat.status ? "OK" : "OVERFLOW"}
                        </span>
                      </div>
                      <span className="text-[8px] text-slate-500 block">Governance limit: {stat.target}</span>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-xl space-y-2">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-500">Telemetry Performance Trends</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    UX entropy and clutter ratios are recorded inside internal memory. Drift detection daemon operates background audits with zero client performance overhead.
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Footer inside drawer */}
          <footer className="px-5 py-4 border-t border-slate-900 bg-slate-900/20 text-center shrink-0">
            <p className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">
              CONFIDENTIAL INTERNAL DEVELOPER PORTAL • ENFORCED BY FGEL CONTRACT 18052026
            </p>
          </footer>
        </div>
      )}
    </>
  );
}
