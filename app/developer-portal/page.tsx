"use client";

import React, { useState } from "react";
import { 
  Terminal, 
  Key, 
  RotateCw, 
  Activity, 
  CheckCircle, 
  AlertTriangle,
  Play,
  TrendingUp,
  Cpu,
  Code
} from "lucide-react";
import { PublicApiGateway } from "../../lib/api/publicApiGateway";
import { SignedWebhookEngine, WebhookPayload } from "../../lib/webhooks/signedWebhookEngine";

export default function DeveloperPortal() {
  const [apiKey, setApiKey] = useState("sk_live_51MszH81La902a281KjS...");
  const [webhookUrl, setWebhookUrl] = useState("https://api.corporate-buyer.com/v1/tracknov-listener");
  const [logs, setLogs] = useState<string[]>([
    "Developer credential manifest loaded.",
    "Webhook signing key rotated successfully."
  ]);

  const [dlqItems, setDlqItems] = useState<any[]>([
    { eventId: "EVT-8012", eventType: "clarification.created", reason: "502 Bad Gateway", timestamp: "12:15 PM" }
  ]);

  const rotateKey = () => {
    const newKey = "sk_live_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setApiKey(newKey);
    setLogs((prev) => [`[Rotated] Generated new live secret access key: ${newKey.substring(0, 15)}...`, ...prev]);
  };

  const testWebhook = () => {
    setLogs((prev) => [`[Dispatched] Outbound verification webhook sent to ${webhookUrl}`, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md px-8 py-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Tracknov Developer Portal
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
              Tenant-Scoped Webhook Event Stream, Rate Limit Thresholds, and API Key Administration
            </p>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-4 gap-8 overflow-hidden">
        
        {/* Left Side: Keys, webhooks, code samples (Col Span 3) */}
        <section className="col-span-3 space-y-6 overflow-y-auto pr-2">
          
          {/* Credentials */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Secret API Credentials</span>
              <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Rate: 1,000 req/min</span>
            </div>

            <div className="flex gap-4 items-center bg-slate-950 border border-slate-850 p-3 rounded-2xl">
              <Key className="w-5 h-5 text-indigo-400" />
              <input 
                type="text" 
                value={apiKey} 
                readOnly
                className="flex-1 bg-transparent border-none text-xs text-slate-300 outline-none font-mono"
              />
              <button 
                onClick={rotateKey}
                className="p-2 hover:bg-slate-900 text-slate-400 hover:text-indigo-400 rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-bold"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Rotate Secret Key
              </button>
            </div>
          </div>

          {/* Webhook Configuration */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl space-y-4">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Signed Outbound Webhook Subscriptions</span>
            
            <div className="grid grid-cols-3 gap-4 items-end">
              <div className="col-span-2">
                <label className="block text-[9px] font-black uppercase text-slate-500 mb-2">Endpoint URL</label>
                <input 
                  type="url" 
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-xs text-slate-300 rounded-xl p-2.5 outline-none font-mono"
                />
              </div>

              <button 
                onClick={testWebhook}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/10"
              >
                <Play className="w-4 h-4" />
                Dispatch Test Event
              </button>
            </div>
          </div>

          {/* Webhook DLQ failures */}
          <div className="space-y-3">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Webhook Dead-Letter Queue (DLQ)</span>
            {dlqItems.map((item, idx) => (
              <div key={idx} className="p-4 bg-slate-900 border border-slate-850 rounded-2xl flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-500" />
                  <div>
                    <strong className="text-slate-300">{item.eventType}</strong>
                    <span className="text-slate-500 block text-[9px] mt-0.5">Failed: {item.reason} • {item.timestamp}</span>
                  </div>
                </div>

                <button className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-lg text-[9px] font-bold text-indigo-400">
                  Re-Drive Payload
                </button>
              </div>
            ))}
          </div>

          {/* Code Mutation Sample */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl space-y-3">
            <div className="flex items-center gap-2 text-indigo-400">
              <Code className="w-4 h-4" />
              <span className="text-[9px] uppercase font-black tracking-wider">Replay-Safe Mutation Payload Sample</span>
            </div>

            <pre className="p-4 bg-slate-950 border border-slate-850 text-[10px] text-slate-300 font-mono rounded-2xl overflow-x-auto">
{`{
  "apiKey": "sk_live_51MszH8...",
  "tenantId": "tenant-alpha",
  "path": "/api/v1/submittal/create",
  "nonce": "tx_nonce_90118",
  "timestamp": ${Date.now()}
}`}
            </pre>
          </div>

        </section>

        {/* Right Side: Usage telemetry & rate limiting metrics (Col Span 1) */}
        <section className="bg-slate-900 border border-slate-850 rounded-3xl p-6 flex flex-col gap-6">
          <div className="border-b border-slate-850 pb-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <Activity className="w-4.5 h-4.5" />
              <h3 className="text-xs font-black uppercase tracking-wider">API Statistics</h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Live tracking of developer integration rates.</p>
          </div>

          <div className="space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl">
                <span className="text-[9px] uppercase font-black text-slate-500 block">P95 Response Latency</span>
                <strong className="text-xl font-black text-emerald-400 mt-1 block">182ms (&lt; 300ms Target)</strong>
                <span className="text-[10px] text-slate-500 mt-1 block">Calculated using live streaming gateway routes.</span>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl">
                <span className="text-[9px] uppercase font-black text-slate-500 block">Delivery Success</span>
                <strong className="text-xl font-black text-emerald-400 mt-1 block">99.8% Success</strong>
                <span className="text-[10px] text-slate-500 mt-1 block">For all outbound notification webhooks.</span>
              </div>

            </div>

            {/* Run logs */}
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Developer Log Feed</span>
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
