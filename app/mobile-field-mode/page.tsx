"use client";

import React, { useState, useEffect } from "react";
import { 
  Wifi, 
  WifiOff, 
  Mic, 
  QrCode, 
  Plus, 
  Layers, 
  CheckCircle, 
  HelpCircle, 
  Clock, 
  ArrowUpCircle,
  Smartphone,
  Sparkles,
  RefreshCw
} from "lucide-react";

interface FieldUploadItem {
  id: string;
  name: string;
  qrTag: string;
  voiceNote: string;
  status: "PENDING_SYNC" | "SYNCED" | "FAILED";
  timestamp: string;
}

export default function MobileFieldMode() {
  const [isOnline, setIsOnline] = useState(true);
  const [uploads, setUploads] = useState<FieldUploadItem[]>([
    {
      id: "FLD-101",
      name: "Field_Photo_Daikan_VRV_Tag.jpg",
      qrTag: "QR-HARITA-MECH-404",
      voiceNote: "Verified chiller unit model number matching sheet specifications on roof floor.",
      status: "SYNCED",
      timestamp: "10:30 AM"
    },
    {
      id: "FLD-102",
      name: "Paint_Can_Low_VOC_Berger_Label.jpg",
      qrTag: "QR-HARITA-CHEM-812",
      voiceNote: "Berger water-based interior primer cans verified in ground warehouse.",
      status: "PENDING_SYNC",
      timestamp: "11:15 AM"
    }
  ]);

  const [newUploadName, setNewUploadName] = useState("");
  const [newVoiceNote, setNewVoiceNote] = useState("");
  const [scannedQR, setScannedQR] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const triggerVoiceDictation = () => {
    setIsRecording(true);
    setTimeout(() => {
      setNewVoiceNote("Auto-captured vocal notes validating paint specifications in site zone.");
      setIsRecording(false);
      setSyncLogs((prev) => [`[Voice Dictated] Transcribed: Auto-captured vocal notes...`, ...prev]);
    }, 2000);
  };

  const triggerQRScan = () => {
    const mockQR = "QR-HARITA-STRUCT-" + Math.floor(Math.random() * 900 + 100);
    setScannedQR(mockQR);
    setSyncLogs((prev) => [`[QR Scanned] Read tag: ${mockQR}`, ...prev]);
  };

  const handleAddFieldUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUploadName.trim()) return;

    const newItem: FieldUploadItem = {
      id: "FLD-" + Math.floor(Math.random() * 1000),
      name: newUploadName.trim() + (newUploadName.includes(".") ? "" : ".jpg"),
      qrTag: scannedQR || "QR-GENERAL-FIELD",
      voiceNote: newVoiceNote || "No vocal description captured.",
      status: isOnline ? "SYNCED" : "PENDING_SYNC",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setUploads((prev) => [newItem, ...prev]);
    setSyncLogs((prev) => [`[Created] Added ${newItem.name} to offline upload stream queue.`, ...prev]);

    // Reset Form
    setNewUploadName("");
    setNewVoiceNote("");
    setScannedQR("");
  };

  const triggerManualSync = () => {
    if (!isOnline) {
      setSyncLogs((prev) => ["[Sync Blocked] Offline. Synchronization requires active network carrier lines.", ...prev]);
      return;
    }

    setUploads((prev) => 
      prev.map((up) => up.status === "PENDING_SYNC" ? { ...up, status: "SYNCED" } : up)
    );
    setSyncLogs((prev) => ["[Synced] Triggered network upload buffer. Stored pending submittals successfully.", ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white max-w-md mx-auto border-x border-slate-900 shadow-2xl relative">
      
      {/* Dynamic PWA Style Header */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-xs font-black uppercase tracking-wider text-slate-200">
              Mobile Field Exec
            </h1>
            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
              Site Auditor PWA (Offline Ingestion)
            </p>
          </div>
        </div>

        {/* Dynamic connection indicator */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
          isOnline ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
        }`}>
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              ONLINE
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 animate-pulse" />
              OFFLINE
            </>
          )}
        </div>
      </header>

      {/* Main Stream Workspace */}
      <main className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[80vh] scrollbar-thin">
        
        {/* Toggle connection manually for testing in browser */}
        <div className="flex gap-2">
          <button 
            onClick={() => setIsOnline(!isOnline)}
            className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-[9px] font-bold uppercase text-slate-400"
          >
            Toggle Network
          </button>
          
          <button 
            onClick={triggerManualSync}
            className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-bold uppercase flex items-center justify-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Sync Queue
          </button>
        </div>

        {/* Form Creator */}
        <form onSubmit={handleAddFieldUpload} className="bg-slate-900 border border-slate-850 p-4 rounded-2xl space-y-4">
          <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block">Capture Site Evidence</span>
          
          <input 
            type="text"
            value={newUploadName}
            onChange={(e) => setNewUploadName(e.target.value)}
            placeholder="Evidence Label (e.g. Paint_Priming_Batch)"
            className="w-full bg-slate-950 border border-slate-850 text-xs text-slate-300 rounded-xl p-2 outline-none"
            required
          />

          <div className="flex gap-3">
            <button 
              type="button"
              onClick={triggerVoiceDictation}
              className={`flex-1 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 border transition-all ${
                isRecording ? "bg-rose-600 border-rose-500 animate-pulse text-white" : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              {isRecording ? "Listening..." : "Vocal Notes"}
            </button>

            <button 
              type="button"
              onClick={triggerQRScan}
              className="flex-1 py-2 bg-slate-950 border border-slate-8-0 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-all"
            >
              <QrCode className="w-3.5 h-3.5" />
              Scan QR Code
            </button>
          </div>

          {scannedQR && (
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-bold text-indigo-400 rounded-lg">
              QR Bound: {scannedQR}
            </div>
          )}

          {newVoiceNote && (
            <div className="p-2 bg-slate-950 border border-slate-850 text-[9px] text-slate-400 italic rounded-lg font-mono">
              "{newVoiceNote}"
            </div>
          )}

          <button 
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all"
          >
            Queue Field Evidence
          </button>
        </form>

        {/* Upload Stream Queue */}
        <div className="space-y-3">
          <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block">Ingestion Synchronization Stream</span>
          
          {uploads.map((up, idx) => (
            <div 
              key={idx}
              className="p-4 bg-slate-900 border border-slate-850 rounded-2xl space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{up.name}</h4>
                  <span className="text-[9px] text-slate-500 mt-1 block">Tag: {up.qrTag} • Captured {up.timestamp}</span>
                </div>

                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                  up.status === "SYNCED" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                }`}>
                  {up.status}
                </span>
              </div>

              <p className="text-[10px] text-slate-400 italic font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-850 leading-relaxed">
                "{up.voiceNote}"
              </p>
            </div>
          ))}
        </div>

        {/* System logs */}
        <div className="space-y-2">
          <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block">Offline Sync Logs</span>
          <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl h-24 overflow-y-auto font-mono text-[9px] text-indigo-400 space-y-1 scrollbar-thin">
            {syncLogs.length > 0 ? (
              syncLogs.map((log, i) => <p key={i}>{log}</p>)
            ) : (
              <p className="text-slate-600">No active sync logs.</p>
            )}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 inset-x-0 bg-slate-900 border-t border-slate-850 p-3 text-center text-[8px] text-slate-500 font-bold uppercase tracking-wider">
        Shield Gate Active • 100% Offline Robust
      </footer>

    </div>
  );
}
