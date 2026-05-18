"use client";

import React, { useState } from "react";
import { 
  Zap, 
  Plus, 
  Trash2, 
  Play, 
  TrendingUp, 
  Hourglass, 
  Sparkles, 
  AlertOctagon,
  ToggleLeft,
  ToggleRight,
  Workflow
} from "lucide-react";
import { ConsultantAutomationEngine, AutomationWorkflowRule } from "../../lib/productivity/consultantAutomationEngine";

export default function AutomationWorkflows() {
  const [rules, setRules] = useState<AutomationWorkflowRule[]>([
    {
      id: "R-01",
      triggerType: "stale_upload",
      thresholdHours: 48,
      assignedAction: "SEND_EMAIL_PING",
      active: true
    },
    {
      id: "R-02",
      triggerType: "clarification_pending",
      thresholdHours: 72,
      assignedAction: "TRIGGER_IMMEDIATE_ESCALATION",
      active: true
    },
    {
      id: "R-03",
      triggerType: "reviewer_delay",
      thresholdHours: 120,
      assignedAction: "SEND_EMAIL_PING",
      active: false
    }
  ]);

  const [telemetry, setTelemetry] = useState(ConsultantAutomationEngine.getTelemetry());
  const [executionLogs, setExecutionLogs] = useState<string[]>([
    "Consultant automation system running.",
    "Synchronized with tenant control plane."
  ]);

  // Form State
  const [newTrigger, setNewTrigger] = useState<AutomationWorkflowRule["triggerType"]>("stale_upload");
  const [newThreshold, setNewThreshold] = useState(24);
  const [newAction, setNewAction] = useState<AutomationWorkflowRule["assignedAction"]>("SEND_EMAIL_PING");

  const addRule = (e: React.FormEvent) => {
    e.preventDefault();
    const rule: AutomationWorkflowRule = {
      id: "R-" + Math.floor(Math.random() * 1000),
      triggerType: newTrigger,
      thresholdHours: newThreshold,
      assignedAction: newAction,
      active: true
    };
    setRules((prev) => [...prev, rule]);
    setExecutionLogs((prev) => [`[Rule Added] Added workflow rule tracking ${newTrigger} threshold of ${newThreshold}h.`, ...prev]);
  };

  const deleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    setExecutionLogs((prev) => [`[Rule Deleted] Removed workflow rule ${id}.`, ...prev]);
  };

  const toggleRule = (id: string) => {
    setRules((prev) => 
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  const testTrigger = (rule: AutomationWorkflowRule) => {
    const result = ConsultantAutomationEngine.triggerRuleCheck(rule);
    if (result.triggered) {
      setExecutionLogs((prev) => [`[TRIGGERED] Rule ${rule.id} matches thresholds! ${result.actionMessage}`, ...prev]);
      // Refresh telemetry
      setTelemetry(ConsultantAutomationEngine.getTelemetry());
    } else {
      setExecutionLogs((prev) => [`[EVALUATED] Rule ${rule.id} checked. No threshold breaches detected.`, ...prev]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md px-8 py-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Workflow className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Consultant Productivity Automation
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
              Define custom escalation rules, track manual hours saved, and eliminate structural workflow friction
            </p>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-4 gap-8 overflow-hidden">
        
        {/* Left Side: Rule list and Creation (Col Span 3) */}
        <section className="col-span-3 space-y-8 pr-2 overflow-y-auto">
          
          {/* Rule Creator */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl space-y-4">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Create Workflow Escalation Rule</h2>
            
            <form onSubmit={addRule} className="grid grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-2">When Trigger Occurs</label>
                <select 
                  value={newTrigger} 
                  onChange={(e) => setNewTrigger(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-850 text-xs text-slate-300 rounded-xl p-2.5 outline-none"
                >
                  <option value="stale_upload">Stale Document Upload</option>
                  <option value="clarification_pending">Clarification SLA Exceeded</option>
                  <option value="supplier_expiry">Supplier Certification Expiry</option>
                  <option value="reviewer_delay">Review Queue Stalled</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-2">Threshold Hours</label>
                <input 
                  type="number" 
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-850 text-xs text-slate-300 rounded-xl p-2 outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-2">Take Action</label>
                <select 
                  value={newAction} 
                  onChange={(e) => setNewAction(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-850 text-xs text-slate-300 rounded-xl p-2.5 outline-none"
                >
                  <option value="SEND_EMAIL_PING">Send Automatic Email Ping</option>
                  <option value="TRIGGER_IMMEDIATE_ESCALATION">Trigger Immediate Escalation</option>
                  <option value="RE_LINK_EVIDENCE">Re-link Compatible Evidence</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/10"
              >
                <Plus className="w-4 h-4" />
                Add Active Rule
              </button>
            </form>
          </div>

          {/* Active Rules List */}
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Active Workspace Automation Rules</h2>
            
            {rules.map((rule, idx) => (
              <div 
                key={idx}
                className="p-5 bg-slate-900 border border-slate-850 hover:border-slate-750 rounded-2xl flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => toggleRule(rule.id)}
                    className="text-slate-500 hover:text-indigo-400 transition-all"
                  >
                    {rule.active ? (
                      <ToggleRight className="w-6 h-6 text-indigo-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>

                  <div>
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{rule.triggerType.replace("_", " ")}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">
                      If condition persists &gt; {rule.thresholdHours} hours → Execute: <strong className="text-indigo-400">{rule.assignedAction}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => testTrigger(rule)}
                    className="p-2 hover:bg-slate-950 rounded-lg text-slate-400 hover:text-indigo-400 transition-all flex items-center gap-1 text-[10px]"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Test Trigger
                  </button>

                  <button 
                    onClick={() => deleteRule(rule.id)}
                    className="p-2 hover:bg-slate-950 rounded-lg text-slate-500 hover:text-rose-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </section>

        {/* Right Side: Productivity Metrics Telemetry (Col Span 1) */}
        <section className="bg-slate-900 border border-slate-850 rounded-3xl p-6 flex flex-col gap-6">
          <div className="border-b border-slate-850 pb-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <TrendingUp className="w-4.5 h-4.5" />
              <h3 className="text-xs font-black uppercase tracking-wider">Productivity Analytics</h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Live tracking of automated manual coordination labor.</p>
          </div>

          <div className="space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl">
                <span className="text-[9px] uppercase font-black text-slate-500 block">Manual Hours Saved</span>
                <strong className="text-2xl font-black text-emerald-400 mt-1 block">{telemetry.manualHoursSaved}h</strong>
                <span className="text-[10px] text-slate-500 mt-1 block leading-normal">
                  Calculated against baseline spreadsheet and follow-up email coordination time.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[10px]">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                  <span className="block text-slate-500">Rules Run</span>
                  <strong className="text-xs text-slate-300 font-black">{telemetry.rulesExecutedCount}</strong>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                  <span className="block text-slate-500">Escalation %</span>
                  <strong className="text-xs text-slate-300 font-black">{telemetry.escalationFrequency.toFixed(1)}%</strong>
                </div>
              </div>

              {/* Bottlenecks list */}
              <div className="space-y-2">
                <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Active Bottlenecks Identified</span>
                <div className="space-y-1.5">
                  {telemetry.activeBottlenecks.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-2.5 bg-slate-950/60 border border-slate-850 rounded-lg text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <AlertOctagon className="w-3.5 h-3.5 text-amber-500" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Run logs */}
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Engine Execution Stream</span>
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl h-28 overflow-y-auto font-mono text-[9px] text-indigo-400 space-y-1 scrollbar-thin">
                {executionLogs.map((log, idx) => (
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
