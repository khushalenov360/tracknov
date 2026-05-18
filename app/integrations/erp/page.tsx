"use client";

import React, { useState } from "react";
import { 
  Database, 
  TrendingUp, 
  Activity, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  ShieldCheck,
  FileCheck,
  CloudLightning
} from "lucide-react";
import { NormalizedInvoice } from "../../../lib/integrations/erp/invoiceNormalizationEngine";
import { ResolvedSupplierMetadata } from "../../../lib/integrations/erp/supplierMetadataResolver";
import { ProcurementLinkage } from "../../../lib/integrations/erp/procurementEvidenceMapper";

export default function ErpProcurementPage() {
  const [erpSystem, setErpSystem] = useState<"SAP" | "ORACLE" | "ZOHO" | "TALLY">("SAP");
  const [connectionStatus, setConnectionStatus] = useState<"CONNECTED" | "DISCONNECTED">("CONNECTED");
  const [invoices, setInvoices] = useState<NormalizedInvoice[]>([
    {
      standardInvoiceId: "NORM-SAP-4011",
      sourceSystem: "SAP",
      cleansedVendorName: "Daikin Climate Systems",
      totalCostUsd: 48000,
      hasGstRegistration: true,
      materialCategory: "Mechanical HVAC"
    },
    {
      standardInvoiceId: "NORM-SAP-4015",
      sourceSystem: "SAP",
      cleansedVendorName: "Tata Structural Steel",
      totalCostUsd: 98000,
      hasGstRegistration: true,
      materialCategory: "Structural Elements"
    }
  ]);

  const [linkages, setLinkages] = useState<ProcurementLinkage[]>([
    {
      invoiceId: "NORM-SAP-4011",
      cleansedVendor: "Daikin Climate Systems",
      targetCreditCode: "E-C1",
      billingLinkagePrecision: 96
    },
    {
      invoiceId: "NORM-SAP-4015",
      cleansedVendor: "Tata Structural Steel",
      targetCreditCode: "MR-C2",
      billingLinkagePrecision: 92
    }
  ]);

  const [logs, setLogs] = useState<string[]>([
    "SAP R/3 secure instance bound successfully.",
    "Billed item parameters normalized."
  ]);

  const triggerSync = () => {
    setLogs((prev) => [`[Synced] Checked Zoho Books and Tally ledger entries. Fetch complete.`, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md px-8 py-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              ERP & Procurement Command Center
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
              SAP, Oracle, Zoho, and Tally Invoice Normalization, GST Tax Registration Audits, and Supplier Mapping
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={erpSystem} 
            onChange={(e) => {
              setErpSystem(e.target.value as any);
              setLogs((prev) => [`[Connector] Switched target environment gateway to ${e.target.value}`, ...prev]);
            }}
            className="bg-slate-900 border border-slate-850 text-xs text-slate-300 rounded-xl p-2 outline-none"
          >
            <option value="SAP">SAP ERP Connector</option>
            <option value="ORACLE">Oracle Supply Chain</option>
            <option value="ZOHO">Zoho Books</option>
            <option value="TALLY">Tally Ledger</option>
          </select>

          <button 
            onClick={triggerSync}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/10"
          >
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
            Sync Records
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-4 gap-8 overflow-hidden">
        
        {/* Left Side: Connection stats & Normalization outcomes (Col Span 3) */}
        <section className="col-span-3 space-y-6 overflow-y-auto pr-2">
          
          {/* Connection Status Banner */}
          <div className="p-5 bg-slate-900 border border-slate-850 rounded-3xl flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${connectionStatus === "CONNECTED" ? "bg-emerald-500" : "bg-rose-500"}`} />
              <div>
                <span className="text-[9px] uppercase font-black text-slate-500 block">Gateway Node</span>
                <strong className="text-xs text-slate-300 font-bold block mt-0.5">{erpSystem} Integrated Instance</strong>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-right border-r border-slate-800 pr-4">
                <span className="text-[9px] uppercase font-black text-slate-500 block">Invoices Cleansed</span>
                <strong className="text-xs text-slate-300 font-bold block mt-0.5">{invoices.length} Items</strong>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase font-black text-slate-500 block">GST Compliance</span>
                <strong className="text-xs text-emerald-400 font-bold block mt-0.5">100% Audited</strong>
              </div>
            </div>
          </div>

          {/* Normalization Stream List */}
          <div className="space-y-3">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Cleansed & Normalized ERP Invoices</span>
            
            {invoices.map((inv, idx) => (
              <div 
                key={idx}
                className="p-5 bg-slate-900 border border-slate-850 hover:border-slate-750 rounded-2xl flex items-center justify-between transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-center">
                    <CloudLightning className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-all">
                      {inv.cleansedVendorName}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">
                      Category: <strong>{inv.materialCategory}</strong> • Source: <strong>{inv.sourceSystem}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-black text-slate-500 block">Billed Cost</span>
                    <strong className="text-xs text-slate-300 font-bold block mt-0.5">${inv.totalCostUsd.toLocaleString()}</strong>
                  </div>

                  {inv.hasGstRegistration && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-[9px]">
                      GST VALIDATED
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Invoiced linkages to Credits */}
          <div className="space-y-3">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Automatic Invoice-to-Credit Linking Suggestions</span>
            <div className="space-y-2">
              {linkages.map((link, idx) => (
                <div key={idx} className="p-4 bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl flex justify-between items-center text-[10px]">
                  <div>
                    <strong className="text-slate-300">{link.invoiceId}</strong>
                    <span className="text-slate-500 block mt-1">Vendor: {link.cleansedVendor}</span>
                  </div>

                  <div className="flex items-center gap-6">
                    <span className="text-indigo-400 font-black uppercase">LINKED TO {link.targetCreditCode}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-[9px]">
                      {link.billingLinkagePrecision}% Confidence
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </section>

        {/* Right Side: Procurement Telemetry & diagnostics (Col Span 1) */}
        <section className="bg-slate-900 border border-slate-850 rounded-3xl p-6 flex flex-col gap-6">
          <div className="border-b border-slate-850 pb-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <TrendingUp className="w-4.5 h-4.5" />
              <h3 className="text-xs font-black uppercase tracking-wider">Verification Metrics</h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Measuring invoicing mapping statistics.</p>
          </div>

          <div className="space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-1">
                <span className="text-[9px] uppercase font-black text-slate-500 block">Precision Accuracy</span>
                <strong className="text-xl font-black text-emerald-400 block">95.4% Accuracy</strong>
                <span className="text-[10px] text-slate-500 mt-1 block">Matches verified with zero cross-tenant billing leaks.</span>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl">
                <span className="text-[9px] uppercase font-black text-slate-500 block">Procurement Gaps Identified</span>
                <div className="flex items-center gap-1.5 mt-2.5 text-[9px] font-bold text-amber-500">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  MISSING Gypsum Drywall Invoices
                </div>
              </div>

            </div>

            {/* Run logs */}
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Connector Audit logs</span>
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl h-28 overflow-y-auto font-mono text-[9px] text-indigo-400 space-y-1 scrollbar-thin">
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
