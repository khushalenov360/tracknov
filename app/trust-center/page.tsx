"use client";

import React from "react";
import { 
  ShieldCheck, 
  Lock, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  History, 
  FileText,
  Activity,
  HeartHandshake
} from "lucide-react";

export default function TrustCenter() {
  const metrics = [
    { label: "Active System Uptime", value: "99.98%" },
    { label: "Certified Security Audits", value: "SOC 2 Type II" },
    { label: "Recovery Point Objective (RPO)", value: "< 1 Minute" },
    { label: "Recovery Time Objective (RTO)", value: "< 15 Minutes" },
  ];

  const categories = [
    {
      title: "Active Security & Encryption Controls",
      icon: <Lock className="w-5 h-5 text-indigo-400" />,
      description: "All client documents and metadata are encrypted in-transit using TLS 1.3 and at-rest via AES-256 standard encryption keys. System databases employ strict Row-Level Security (RLS) layers to guarantee isolation.",
      documents: [
        { name: "View security.txt Policy", href: "/security.txt" }
      ]
    },
    {
      title: "Strict Multi-Tenant Isolation Guarantee",
      icon: <ShieldCheck className="w-5 h-5 text-indigo-400" />,
      description: "Every organization and project operates in a cryptographically isolated tenant boundary. System queries are gated at the network, role, and row layers, preventing cross-project document leakage.",
      documents: [
        { name: "SLA Infrastructure Agreement", href: "/sla.html" }
      ]
    },
    {
      title: "Disaster Recovery & Backup Policies",
      icon: <Database className="w-5 h-5 text-indigo-400" />,
      description: "Database snapshots are continuously updated and stored in multi-region secure servers. We execute daily full backups and transaction log backups every minute to prevent data loss under all conditions.",
      documents: [
        { name: "Disaster Recovery Procedures", href: "/disaster-recovery.html" }
      ]
    },
    {
      title: "Certification Consistency & Lineage Verification",
      icon: <RefreshCw className="w-5 h-5 text-indigo-400" />,
      description: "Tracknov implements historical certification record verification. All workflow state changes, submittals, and review choices are cryptographically signed to maintain a defensible audit trail.",
      documents: []
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Premium Trust Header */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wide bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Tracknov Security & Compliance Trust Center
            </h1>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">
              Authoritative Security Policies, Isolation Guarantees & Recovery Runbooks
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-8 space-y-8">
        
        {/* Intro */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-2 max-w-xl">
            <h2 className="text-lg font-black text-slate-200">Our Enterprise Commitment</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              We design Tracknov to be secure, deterministic, and highly resilient. This portal outlines all operational controls, uptime history, backup configurations, and multi-tenant isolation architectures built directly into the system core.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full md:w-auto shrink-0">
            {metrics.map((m, i) => (
              <div key={i} className="bg-slate-950 border border-slate-850 p-4 rounded-2xl text-center">
                <span className="text-lg font-black text-indigo-400">{m.value}</span>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-wider">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Breakdown of Policies */}
        <div className="grid grid-cols-2 gap-6">
          {categories.map((cat, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-850 p-6 rounded-3xl space-y-4 hover:border-slate-800 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-950/20 border border-indigo-900/30 rounded-xl shrink-0">
                    {cat.icon}
                  </div>
                  <h3 className="text-sm font-bold text-slate-200">{cat.title}</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{cat.description}</p>
              </div>

              {cat.documents.length > 0 && (
                <div className="pt-4 border-t border-slate-850 flex gap-2">
                  {cat.documents.map((doc, dIdx) => (
                    <a
                      key={dIdx}
                      href={doc.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-slate-950 border border-slate-800 hover:border-indigo-500 hover:bg-slate-900 text-[10px] font-bold text-slate-300 rounded-xl transition-all inline-flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      {doc.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Commitment Statement */}
        <div className="p-6 bg-indigo-950/10 border border-indigo-900/30 rounded-3xl flex items-center gap-4">
          <HeartHandshake className="w-6 h-6 text-indigo-400 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-indigo-300">Absolute Governance Transparency</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              We stand by our technology guarantees. All compliance frameworks are verified against deterministic checks. If you have enterprise security questions, please reach out to our security team via security@tracknov.com.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
