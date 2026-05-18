"use client";

import React from "react";
import { AlertCircle, RefreshCw, CheckCircle2, ShieldAlert, Sparkles, HelpCircle } from "lucide-react";

interface UploadRecoveryStatusProps {
  fileName: string;
  fileSize: number;
  retryStatus: "idle" | "retrying" | "success" | "failed";
  ocrStatus: "not_started" | "processing" | "completed" | "warning";
  quarantineState: "clean" | "quarantined";
  ocrScore: number;
  recoveryAttempts: number;
  suggestions: string[];
  partialRecoveryPercentage?: number;
  onRetry?: () => void;
}

export function UploadRecoveryStatus({
  fileName,
  fileSize,
  retryStatus,
  ocrStatus,
  quarantineState,
  ocrScore,
  recoveryAttempts,
  suggestions,
  partialRecoveryPercentage = 100,
  onRetry,
}: UploadRecoveryStatusProps) {
  const isWarningOcr = ocrStatus === "warning" || ocrScore < 0.85;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 text-slate-100">
      {/* File Info */}
      <div className="flex justify-between items-start border-b border-slate-800 pb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-200 truncate max-w-[280px]">
            {fileName}
          </h4>
          <p className="text-xs text-slate-500 font-medium">
            {(fileSize / 1024 / 1024).toFixed(2)} MB • Ingestion Status
          </p>
        </div>
        <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full ${
          quarantineState === "quarantined" 
            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
        }`}>
          {quarantineState === "quarantined" ? "Requires Action" : "Secure"}
        </span>
      </div>

      {/* Progress & Recover Statuses */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
          <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Upload Integrity</p>
          <div className="flex items-center gap-2">
            {retryStatus === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {retryStatus === "retrying" && <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />}
            {retryStatus === "failed" && <ShieldAlert className="w-4 h-4 text-rose-400" />}
            {retryStatus === "idle" && <HelpCircle className="w-4 h-4 text-slate-400" />}
            
            <span className="text-xs font-bold text-slate-200 capitalize">
              {retryStatus === "retrying" 
                ? `Recovering (Attempt ${recoveryAttempts})` 
                : retryStatus === "success" 
                ? "Perfect Connection" 
                : retryStatus === "failed" 
                ? "Connection Aborted" 
                : "Checking Connection..."}
            </span>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
          <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Text Quality Rating</p>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${
              ocrScore >= 0.9 ? "text-emerald-400" : ocrScore >= 0.75 ? "text-amber-400" : "text-rose-400"
            }`}>
              {(ocrScore * 100).toFixed(0)}% Readability Score
            </span>
          </div>
        </div>
      </div>

      {/* Partial recovery slide */}
      {partialRecoveryPercentage < 100 && (
        <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
          <div className="flex justify-between text-xs text-amber-400 font-bold mb-1.5">
            <span>Partial Recovery Achieved</span>
            <span>{partialRecoveryPercentage}% saved</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${partialRecoveryPercentage}%` }}></div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            We recovered most of your upload from a mobile/network disconnect. You can continue or click re-upload for full document clarity.
          </p>
        </div>
      )}

      {/* Warnings & OCR Tips */}
      {isWarningOcr && (
        <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-amber-400">Scanned Document Warning</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              This document looks like a raw photocopy or a scan. The system will auto-align and attempt table extraction, but original digital PDF files are highly recommended for the best accuracy.
            </p>
          </div>
        </div>
      )}

      {/* Quarantine Alert */}
      {quarantineState === "quarantined" && (
        <div className="p-4 bg-rose-500/5 border border-rose-500/15 rounded-xl flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-rose-400">Safety & Duplication Quarantine</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              This file was auto-flagged because we detected highly similar technical parameters matching an existing submittal, or because the file parsing failed.
            </p>
            {onRetry && (
              <button 
                onClick={onRetry}
                className="mt-2 text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                Force recheck or re-upload
              </button>
            )}
          </div>
        </div>
      )}

      {/* Suggestions Bullet Points */}
      {suggestions.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Recommendations</p>
          <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
            {suggestions.map((suggestion, idx) => (
              <li key={idx}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
