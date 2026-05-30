"use client";

import React, { useState } from "react";
import { 
  Users, 
  ShieldCheck, 
  Activity, 
  Trash2, 
  ToggleRight, 
  ToggleLeft,
  AlertTriangle,
  Lock,
  RefreshCw,
  Building
} from "lucide-react";
import { SessionDetail } from "@tracknov/core/auth/sso/enterpriseSessionAudit";

export default function IdentityGovernancePage() {
  const [provider, setProvider] = useState<"SAML" | "AZURE" | "OKTA" | "GOOGLE">("OKTA");
  const [samlActive, setSamlActive] = useState(true);
  const [oktaActive, setOktaActive] = useState(true);
  const [azureActive, setAzureActive] = useState(false);

  const [sessions, setSessions] = useState<SessionDetail[]>([
    {
      sessionId: "SESS-90112",
      userId: "governor@harita.com",
      ipAddress: "192.168.1.12",
      deviceType: "Corporate MacBook Pro",
      lastActive: "Active Now",
      suspiciousActivity: false
    },
    {
      sessionId: "SESS-90115",
      userId: "auditor@harita.com",
      ipAddress: "10.99.85.12", // Suspicious IP
      deviceType: "Unknown Mobile Chrome",
      lastActive: "15 minutes ago",
      suspiciousActivity: true
    }
  ]);

  const [logs, setLogs] = useState<string[]>([
    "SSO Gateways checked.",
    "Okta identity sync active."
  ]);

  const forceLogout = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.sessionId !== id));
    setLogs((prev) => [`[Forced Logout] Terminated session ${id} instantly.`, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md px-8 py-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Enterprise SSO & Identity Governance
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
              Manage corporate SAML providers, Azure AD integration parameters, and SCIM synchronization
            </p>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-4 gap-8 overflow-hidden">
        
        {/* Left Side: Active SSO connections, session management (Col Span 3) */}
        <section className="col-span-3 space-y-6 overflow-y-auto pr-2">
          
          {/* SSO Configuration */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl space-y-4">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Active Single Sign-On Providers</span>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Okta Identity Cloud</h4>
                  <span className="text-[9px] text-slate-500 block mt-1">SCIM and RBAC enabled</span>
                </div>
                <button onClick={() => setOktaActive(!oktaActive)}>
                  {oktaActive ? <ToggleRight className="w-6 h-6 text-indigo-400" /> : <ToggleLeft className="w-6 h-6 text-slate-500" />}
                </button>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Microsoft Entra ID (Azure)</h4>
                  <span className="text-[9px] text-slate-500 block mt-1">Azure AD Tenant integration</span>
                </div>
                <button onClick={() => setAzureActive(!azureActive)}>
                  {azureActive ? <ToggleRight className="w-6 h-6 text-indigo-400" /> : <ToggleLeft className="w-6 h-6 text-slate-500" />}
                </button>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">SAML Core Provider</h4>
                  <span className="text-[9px] text-slate-500 block mt-1">XML assertions</span>
                </div>
                <button onClick={() => setSamlActive(!samlActive)}>
                  {samlActive ? <ToggleRight className="w-6 h-6 text-indigo-400" /> : <ToggleLeft className="w-6 h-6 text-slate-500" />}
                </button>
              </div>
            </div>
          </div>

          {/* Active Sessions Grid */}
          <div className="space-y-3">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Active Enterprise Corporate Sessions</span>
            
            {sessions.map((sess, idx) => (
              <div 
                key={idx}
                className="p-5 bg-slate-900 border border-slate-850 hover:border-slate-750 rounded-2xl flex items-center justify-between transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">{sess.userId}</h3>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      IP: <strong>{sess.ipAddress}</strong> • Device: <strong>{sess.deviceType}</strong> • {sess.lastActive}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {sess.suspiciousActivity && (
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-black text-[9px] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      SUSPICIOUS IP
                    </span>
                  )}

                  <button 
                    onClick={() => forceLogout(sess.sessionId)}
                    className="p-2 hover:bg-slate-950 text-slate-500 hover:text-rose-500 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </section>

        {/* Right Side: Security statistics & audits (Col Span 1) */}
        <section className="bg-slate-900 border border-slate-850 rounded-3xl p-6 flex flex-col gap-6">
          <div className="border-b border-slate-850 pb-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <ShieldCheck className="w-4.5 h-4.5" />
              <h3 className="text-xs font-black uppercase tracking-wider">Identity Health</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">Audit status of SSO profiles.</p>
          </div>

          <div className="space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-1">
                <span className="text-[9px] uppercase font-black text-slate-500 block">SSO Success Rate</span>
                <strong className="text-xl font-black text-emerald-400 block">99.9% Success</strong>
                <span className="text-xs text-slate-500 mt-1 block">With zero unauthorized tenant logins or SCIM sync skips.</span>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-1">
                <span className="text-[9px] uppercase font-black text-slate-500 block">SCIM Sync State</span>
                <strong className="text-xl font-black text-emerald-400 block">100% Reliable</strong>
                <span className="text-xs text-slate-500 mt-1 block">All roles map to L5, L6, L7 profiles automatically.</span>
              </div>

            </div>

            {/* Run logs */}
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">SSO Gate Audits</span>
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl h-24 overflow-y-auto font-mono text-[9px] text-indigo-400 space-y-1 scrollbar-thin">
                {logs.map((log, idx) => (
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
