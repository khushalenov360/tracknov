"use client";

import React, { useState } from "react";
import { CustomerRiskEngine, RiskFactors } from "@/lib/harita-engine/customer-intelligence/customerRiskEngine";
import { 
  Heart, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  Activity, 
  Users, 
  UploadCloud, 
  HelpCircle,
  Clock,
  Sparkles,
  ArrowRight
} from "lucide-react";

interface TenantHealthRow {
  tenantName: string;
  industry: string;
  factors: RiskFactors;
  contactName: string;
}

export default function CustomerSurvivabilityDashboard() {
  // Pilot Tenants Onboarding under Real Human Conditions
  const tenants: TenantHealthRow[] = [
    {
      tenantName: "Harita Tech Park Developers",
      industry: "Real Estate Development",
      contactName: "Vikram Sen",
      factors: {
        onboardingAbandoned: false,
        failedUploadCount: 1,
        stalledClarificationLoops: 0,
        reviewerInactivityDays: 1,
        lowAiTrustIncidentCount: 0,
        exportGenerationRetries: 0,
        supportTicketSpike: false,
        inactivityDays: 0,
      }
    },
    {
      tenantName: "Bhavarkua Construction Corp",
      industry: "Infrastructure & Cities",
      contactName: "Anil Mehta",
      factors: {
        onboardingAbandoned: false,
        failedUploadCount: 4,
        stalledClarificationLoops: 2,
        reviewerInactivityDays: 3,
        lowAiTrustIncidentCount: 1,
        exportGenerationRetries: 1,
        supportTicketSpike: true,
        inactivityDays: 4,
      }
    },
    {
      tenantName: "Sigma Green Consultants",
      industry: "Sustainability Advisory",
      contactName: "Meera Nair",
      factors: {
        onboardingAbandoned: true,
        failedUploadCount: 7,
        stalledClarificationLoops: 4,
        reviewerInactivityDays: 11,
        lowAiTrustIncidentCount: 5,
        exportGenerationRetries: 3,
        supportTicketSpike: true,
        inactivityDays: 15,
      }
    }
  ];

  const getHealthBadge = (status: "GREEN" | "YELLOW" | "RED") => {
    switch (status) {
      case "GREEN":
        return <span className="bg-emerald-950/60 border border-emerald-900/60 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full">GREEN - Healthy</span>;
      case "YELLOW":
        return <span className="bg-amber-950/60 border border-amber-900/60 text-amber-400 text-xs font-bold px-3 py-1 rounded-full">YELLOW - At Risk</span>;
      case "RED":
        return <span className="bg-rose-950/60 border border-rose-900/60 text-rose-400 text-xs font-bold px-3 py-1 rounded-full">RED - High Churn Risk</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Premium Dashboard Header */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wide bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Tracknov Pilot Survivability & Churn Dashboard
            </h1>
            <p className="text-xs text-slate-500 uppercase font-black tracking-wider">
              Observe customer friction, upload frustrations, and support spikes in real time
            </p>
          </div>
        </div>
      </header>

      {/* Main Workspace grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-8">
        
        {/* Quick KPI stats */}
        <div className="grid grid-cols-4 gap-6">
          {[
            { label: "Active Pilot Tenants", value: "3 Sites", trend: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />, trendLabel: "Stable" },
            { label: "Onboarding Completion", value: "66.7%", trend: <TrendingDown className="w-3.5 h-3.5 text-rose-400" />, trendLabel: "1 Abandoned" },
            { label: "Auto-Healed Uploads", value: "92.4%", trend: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />, trendLabel: "+4.1% Rec." },
            { label: "AI Guideline Trust", value: "88.1%", trend: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />, trendLabel: "Low overrides" },
          ].map((kpi, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-850 p-5 rounded-2xl space-y-2">
              <span className="text-xs uppercase font-black text-slate-500 tracking-wider block">{kpi.label}</span>
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-black text-slate-200">{kpi.value}</span>
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  {kpi.trend}
                  {kpi.trendLabel}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Health Table */}
        <div className="bg-slate-900 border border-slate-850 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-850 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider">Pilot Ingress Health Logs</h3>
              <p className="text-xs text-slate-500 mt-1">Real-time health matrix output evaluating customer survivability conditions.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-850 bg-slate-950/40 text-xs uppercase font-bold text-slate-500 tracking-wider">
                  <th className="p-4 pl-6">Tenant Organization</th>
                  <th className="p-4">Primary Contact</th>
                  <th className="p-4 text-center">Failed Uploads</th>
                  <th className="p-4 text-center">Stalled Loops</th>
                  <th className="p-4 text-center">Inactivity</th>
                  <th className="p-4 text-center">AI Overrides</th>
                  <th className="p-4 text-right pr-6">Health Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {tenants.map((row, idx) => {
                  const health = CustomerRiskEngine.analyzeHealth(row.factors);
                  return (
                    <tr key={idx} className="hover:bg-slate-950/20 transition-all text-xs text-slate-300">
                      <td className="p-4 pl-6 font-bold text-slate-100">
                        {row.tenantName}
                        <span className="block text-xs text-slate-500 font-medium mt-0.5">{row.industry}</span>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-400">{row.contactName}</td>
                      <td className="p-4 text-center font-bold text-slate-200">{row.factors.failedUploadCount}</td>
                      <td className="p-4 text-center font-bold text-slate-200">{row.factors.stalledClarificationLoops}</td>
                      <td className="p-4 text-center font-bold text-slate-200">{row.factors.inactivityDays} days</td>
                      <td className="p-4 text-center font-bold text-slate-200">{row.factors.lowAiTrustIncidentCount}</td>
                      <td className="p-4 text-right pr-6">{getHealthBadge(health.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Risk Breakdown Cards */}
        <div className="grid grid-cols-3 gap-6">
          {tenants.map((row, idx) => {
            const health = CustomerRiskEngine.analyzeHealth(row.factors);
            return (
              <div 
                key={idx}
                className={`p-6 rounded-3xl border transition-all ${
                  health.status === "RED" ? "bg-rose-950/5 border-rose-900/40" :
                  health.status === "YELLOW" ? "bg-amber-950/5 border-amber-900/40" :
                  "bg-emerald-950/5 border-emerald-900/40"
                } space-y-4 flex flex-col justify-between`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-200">{row.tenantName}</h4>
                    <span className={`text-xs font-black px-2 py-0.5 rounded ${
                      health.status === "RED" ? "bg-rose-500/10 text-rose-400" :
                      health.status === "YELLOW" ? "bg-amber-500/10 text-amber-400" :
                      "bg-emerald-500/10 text-emerald-400"
                    }`}>
                      Score: {health.score}/100
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{health.riskDescription}</p>
                </div>

                {health.contributingFactors.length > 0 ? (
                  <div className="space-y-1.5 pt-3 border-t border-slate-900">
                    <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Identified Friction Points</span>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400">
                      {health.contributingFactors.map((fac, fIdx) => (
                        <li key={fIdx}>{fac}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-slate-900 text-center">
                    <span className="text-xs text-emerald-400 font-bold">Zero active friction factors detected.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </main>
    </div>
  );
}
