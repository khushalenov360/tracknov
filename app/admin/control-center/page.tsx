"use client";

import React, { useState } from "react";

// Types for Subsystem Status
type SubsystemHealth = "HEALTHY" | "DEGRADED" | "CRITICAL";

interface Subsystem {
  id: string;
  name: string;
  category: string;
  status: SubsystemHealth;
  uptime: string;
  metric: string;
  metricLabel: string;
}

export default function ControlCenter() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedSubsystem, setSelectedSubsystem] = useState<string | null>(null);

  // Subsystems mapping directly to Phase 3 requirements
  const subsystems: Subsystem[] = [
    {
      id: "intel-gov",
      name: "Intelligence Governance",
      category: "core",
      status: "HEALTHY",
      uptime: "99.98%",
      metric: "0.00000% Drift",
      metricLabel: "Replay mutation drift",
    },
    {
      id: "replay-integrity",
      name: "Replay Integrity",
      category: "integrity",
      status: "HEALTHY",
      uptime: "100.00%",
      metric: "4,821 Replays",
      metricLabel: "Deterministic transactions",
    },
    {
      id: "doc-intel",
      name: "Document Intelligence",
      category: "pipeline",
      status: "HEALTHY",
      uptime: "99.95%",
      metric: "18,401 Pages",
      metricLabel: "Successfully analyzed",
    },
    {
      id: "semantic-drift",
      name: "Semantic Drift",
      category: "core",
      status: "HEALTHY",
      uptime: "99.99%",
      metric: "<0.012 Delta",
      metricLabel: "Classification shift",
    },
    {
      id: "tenant-isolation",
      name: "Tenant Isolation",
      category: "security",
      status: "HEALTHY",
      uptime: "100.00%",
      metric: "0 Breaches",
      metricLabel: "Strict isolation validations",
    },
    {
      id: "benchmark-health",
      name: "Benchmark Health",
      category: "pipeline",
      status: "HEALTHY",
      uptime: "99.88%",
      metric: "98.7% Acc.",
      metricLabel: "OCR / extraction precision",
    },
    {
      id: "extraction-accuracy",
      name: "Extraction Accuracy",
      category: "core",
      status: "HEALTHY",
      uptime: "99.92%",
      metric: "99.42% Score",
      metricLabel: "Field validation rating",
    },
    {
      id: "upload-gov",
      name: "Upload Governance",
      category: "security",
      status: "HEALTHY",
      uptime: "100.00%",
      metric: "10 MB Hard Limit",
      metricLabel: "Enforced upload guardrail",
    },
    {
      id: "release-cert",
      name: "Release Certification",
      category: "integrity",
      status: "HEALTHY",
      uptime: "100.00%",
      metric: "v1.0.8 Active",
      metricLabel: "CI/CD safety gate state",
    },
  ];

  // Mock telemetry feed corresponding to actual SystemTelemetryEvent contracts
  const [logs, setLogs] = useState<any[]>([
    {
      id: "tx-log-1",
      timestamp: new Date(Date.now() - 2000).toISOString(),
      subsystem: "ReplayIntegrity",
      severity: "INFO",
      event: "Deterministic snapshot state hash validation succeeded",
      payload: { snapshotId: "snap_bh_93120", durationMs: 42 }
    },
    {
      id: "tx-log-2",
      timestamp: new Date(Date.now() - 5000).toISOString(),
      subsystem: "TenantIsolation",
      severity: "INFO",
      event: "Strict multi-tenant isolation guard check passed",
      payload: { projectId: "proj_bhavarkua_001", tenantId: "tenant_l5_admin" }
    },
    {
      id: "tx-log-3",
      timestamp: new Date(Date.now() - 12000).toISOString(),
      subsystem: "UploadGovernance",
      severity: "INFO",
      event: "Document ingestion size guardrail validated",
      payload: { fileSize: 4892110, status: "ALLOWED" }
    },
    {
      id: "tx-log-4",
      timestamp: new Date(Date.now() - 22000).toISOString(),
      subsystem: "SemanticDrift",
      severity: "WARN",
      event: "Minor semantic index threshold recalculation triggered",
      payload: { currentDelta: 0.0041, action: "AUTO_STABILIZED" }
    }
  ]);

  const filteredSubsystems = activeTab === "all" 
    ? subsystems 
    : subsystems.filter(s => s.category === activeTab);

  const getStatusColor = (status: SubsystemHealth) => {
    switch (status) {
      case "HEALTHY": return "bg-emerald-500 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.3)]";
      case "DEGRADED": return "bg-amber-500 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.3)]";
      case "CRITICAL": return "bg-rose-500 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.3)]";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Premium Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            T
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-wide bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Tracknov Unified Control Center
            </h1>
            <p className="text-xs text-slate-500 tracking-wider uppercase">
              Platform Consolidation & Safety Orchestrator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-900/50 text-emerald-400 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            SYSTEM COMPLIANCE LEVEL: SECURE
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-3 gap-8">
        
        {/* Left Side: Domain Health Grid (Col span 2) */}
        <section className="col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-200">
                Consolidated Bounded Domains
              </h2>
              <p className="text-sm text-slate-400">
                Enterprise safety subsystems & governance control planes.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              {["all", "core", "integrity", "security", "pipeline"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded text-xs font-medium capitalize transition-all duration-200 ${
                    activeTab === tab 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Subsystem Health Cards Grid */}
          <div className="grid grid-cols-2 gap-4">
            {filteredSubsystems.map((subsystem) => (
              <div
                key={subsystem.id}
                onClick={() => setSelectedSubsystem(subsystem.id)}
                className={`group border rounded-xl p-5 transition-all duration-300 cursor-pointer ${
                  selectedSubsystem === subsystem.id
                    ? "bg-slate-900 border-indigo-500 shadow-md shadow-indigo-950/20"
                    : "bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">
                    {subsystem.name}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusColor(subsystem.status)}`}>
                    {subsystem.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/60">
                  <div>
                    <p className="text-[10px] uppercase text-slate-500 tracking-wider">Metrics Output</p>
                    <p className="text-sm font-semibold text-slate-300">{subsystem.metric}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-slate-500 tracking-wider">Availability</p>
                    <p className="text-sm font-semibold text-emerald-400">{subsystem.uptime}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Selected Domain Focus Panel */}
          {selectedSubsystem && (
            <div className="p-6 rounded-xl border border-indigo-900/40 bg-indigo-950/10 backdrop-blur-md mt-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-slate-200">
                    {subsystems.find(s => s.id === selectedSubsystem)?.name}
                  </h3>
                  <p className="text-xs text-indigo-400 font-mono mt-0.5">Domain Reference: /lib/{selectedSubsystem === "intel-gov" ? "intelligence/governance" : selectedSubsystem.replace("-", "/")}</p>
                </div>
                <button 
                  onClick={() => setSelectedSubsystem(null)}
                  className="text-slate-500 hover:text-slate-300 text-xs"
                >
                  Close Focus Panel
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg">
                  <p className="text-[10px] uppercase text-slate-500">Security Isolation</p>
                  <p className="text-sm font-semibold text-slate-300 mt-1">Tenant-Isolated</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg">
                  <p className="text-[10px] uppercase text-slate-500">Execution Purity</p>
                  <p className="text-sm font-semibold text-slate-300 mt-1">Replay Safe</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg">
                  <p className="text-[10px] uppercase text-slate-500">Last Telemetry</p>
                  <p className="text-sm font-semibold text-emerald-400 mt-1">Passed (0 ms drift)</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Right Side: Security Telemetry & System Stream */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col h-[calc(100vh-140px)]">
          <div className="mb-4">
            <h2 className="text-lg font-bold tracking-tight text-slate-200">
              Live Audit Stream
            </h2>
            <p className="text-xs text-slate-400">
              Real-time enterprise safety and validation telemetry feed.
            </p>
          </div>

          {/* Telemetry Logs */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {logs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg space-y-2 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-indigo-400 font-mono">
                    {log.subsystem}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${
                    log.severity === "CRITICAL" ? "bg-rose-950 text-rose-400 border border-rose-900" :
                    log.severity === "WARN" ? "bg-amber-950 text-amber-400 border border-amber-900" :
                    "bg-slate-900 text-slate-400 border border-slate-800"
                  }`}>
                    {log.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-snug">{log.event}</p>
                <div className="bg-slate-900/60 p-2 rounded text-[9px] font-mono text-slate-500 truncate">
                  {JSON.stringify(log.payload)}
                </div>
              </div>
            ))}
          </div>

          {/* Integration Status Footer */}
          <div className="mt-6 pt-4 border-t border-slate-800 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Governance Gate status:</span>
              <span className="text-emerald-400 font-semibold">Active & Certified</span>
            </div>
            <button 
              onClick={() => {
                // Mock dispatching another log
                const newLog = {
                  id: `tx-log-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  subsystem: "ReleaseCertification",
                  severity: "INFO",
                  event: "Manual diagnostic safety checks completed cleanly.",
                  payload: { initiator: "L5_Admin", status: "PASS" }
                };
                setLogs([newLog, ...logs]);
              }}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-xs font-semibold tracking-wide transition-all shadow-md shadow-indigo-600/20"
            >
              Dispatch Diagnostic Check
            </button>
          </div>
        </section>

      </main>

      {/* Global Status Footer */}
      <footer className="border-t border-slate-800 py-3 px-8 text-center text-xs text-slate-500 bg-slate-900/20">
        © 2026 Tracknov Sustainability Operating System • Deterministic Compliance Guaranteed
      </footer>
    </div>
  );
}
