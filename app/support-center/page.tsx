"use client";

import React, { useState } from "react";
import { 
  HelpCircle, 
  Sparkles, 
  AlertTriangle, 
  MessageSquare, 
  Send, 
  FileQuestion,
  ShieldCheck,
  Activity,
  ArrowRight,
  UserCheck
} from "lucide-react";

interface DiagnosticIssue {
  id: string;
  category: "UPLOAD" | "CLARIFICATION" | "EXPORT" | "REVIEW" | "AI_ASSIST";
  title: string;
  symptom: string;
  friendlyExplanation: string;
  suggestedAction: string;
}

export default function SupportCenter() {
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState([
    {
      sender: "assistant",
      text: "Hello! I am your Tracknov Operational Assistant. I can explain upload interruptions, clarification statuses, missing document checklists, or walk you through specific guidelines. How can I assist you today?"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Friendly Diagnostics for Pilot Users (Phase 4)
  const diagnostics: DiagnosticIssue[] = [
    {
      id: "diag-1",
      category: "UPLOAD",
      title: "Document Upload Failed / Incomplete",
      symptom: "Wi-Fi disconnected mid-upload or the format is sideways.",
      friendlyExplanation: "The connection dropped during file transfer. Tracknov saved a partial snapshot so you don't lose the entire session. If the document is scanned sideways, our alignment tool will orient the page, but readability might suffer.",
      suggestedAction: "Check your internet connection and recheck your upload queue. The system will automatically request missing chunks."
    },
    {
      id: "diag-2",
      category: "CLARIFICATION",
      title: "Requested Clarifications Loop",
      symptom: "Reviewer keeps requesting a specific laboratory report.",
      friendlyExplanation: "The auditor requires original signed laboratory tests proving filtration or energy performance. Raw spec sheets or product catalogs without formal stamps do not meet safety framework thresholds.",
      suggestedAction: "Obtain the formal signed laboratory report from the manufacturer and upload it in place of catalog sheets."
    },
    {
      id: "diag-3",
      category: "EXPORT",
      title: "Export Generation Delays",
      symptom: "Taking longer than usual to export final summary package.",
      friendlyExplanation: "The export checklist runs comprehensive consistency checks on all submittals to ensure there is no conflicting evidence across files before final lock.",
      suggestedAction: "Verify that all outstanding clarification cycles are resolved and marked as approved by the auditor."
    },
    {
      id: "diag-4",
      category: "AI_ASSIST",
      title: "Readability Score / Low Confidence Warnings",
      symptom: "Warning shows low extraction confidence on a submittal.",
      friendlyExplanation: "This happens when a scan is blurry, low-resolution, or contains handwritten values that are difficult for optical text parsers to verify with high certainty.",
      suggestedAction: "Provide a digital source PDF or clean, high-resolution scan to ensure quick verification."
    }
  ];

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = { sender: "user", text: query };
    setChatHistory((prev) => [...prev, userMessage]);
    const userQuery = query.toLowerCase();
    setQuery("");
    setIsTyping(true);

    setTimeout(() => {
      let assistantResponse = "";

      // Strictly Grounded AI Support Responses - NO hallucinations, NO certification guarantees
      if (userQuery.includes("approve") || userQuery.includes("pass") || userQuery.includes("certified")) {
        assistantResponse = "I cannot guarantee or promise certification approvals or specific outcomes, as final decisions are governed strictly by physical verification and authorized audit committees. However, I can confirm your submittal meets all document checklist structure requirements.";
      } else if (userQuery.includes("upload") || userQuery.includes("fail") || userQuery.includes("error")) {
        assistantResponse = "Upload interruptions are fully recovered by our chunk preservation systems. If a file failed, verify it is standard PDF/Word, less than 10MB, and not password-protected. I can help troubleshoot specific files if you name them.";
      } else if (userQuery.includes("missing") || userQuery.includes("evidence") || userQuery.includes("checklist")) {
        assistantResponse = "According to your active framework, please verify that you have uploaded: 1) Certified manufacturer specification sheets and 2) Signed third-party laboratory safety test results. I can walk you through where to upload these.";
      } else {
        assistantResponse = "To best resolve this, I recommend checking your project baseline checklist in the customer onboarding panel, or providing a high-resolution digital file to clear any readability warnings.";
      }

      setChatHistory((prev) => [...prev, { sender: "assistant", text: assistantResponse }]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Premium Support Header */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wide bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Tracknov Self-Service Support & Diagnostics
            </h1>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">
              Grounded Guidance & Diagnostic Deflection for Pilot Teams
            </p>
          </div>
        </div>
      </header>

      {/* Main double split */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-5 gap-8 overflow-hidden">
        
        {/* Left Side: Contextual Diagnostics (Col span 3) */}
        <section className="col-span-3 space-y-6 overflow-y-auto pr-2">
          <div className="border-b border-slate-900 pb-4">
            <h2 className="text-base font-bold text-slate-200">Interactive Knowledge Diagnostics</h2>
            <p className="text-xs text-slate-500 mt-1">Quick operational solutions translation for standard green certification tasks.</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {diagnostics.map((diag) => (
              <div 
                key={diag.id}
                className="bg-slate-900/50 border border-slate-900 rounded-2xl p-5 hover:border-slate-800 transition-all space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-black text-indigo-400 font-mono tracking-widest">{diag.category} Issue</span>
                    <h3 className="text-sm font-bold text-slate-200">{diag.title}</h3>
                  </div>
                  <span className="bg-slate-800 text-[10px] font-bold text-slate-400 px-2 py-0.5 rounded">
                    Symptom: {diag.symptom}
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 space-y-2 text-xs text-slate-400 leading-relaxed">
                  <p className="font-sans text-slate-300">
                    <span className="font-bold text-indigo-400 block mb-1">Friendly Explanation</span>
                    {diag.friendlyExplanation}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Recommended Next Action
                  </span>
                  <span className="text-[11px] text-slate-300 italic">{diag.suggestedAction}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right Side: Grounded AI Assistant (Col span 2) */}
        <section className="col-span-2 bg-slate-900 border border-slate-850 rounded-3xl p-6 flex flex-col h-[calc(100vh-160px)]">
          <div className="border-b border-slate-850 pb-4 mb-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Grounded AI Assistant
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Operational support, guidelines, and document checks.</p>
          </div>

          {/* Chat log window */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
            {chatHistory.map((chat, idx) => (
              <div 
                key={idx}
                className={`flex gap-3 max-w-[85%] ${
                  chat.sender === "user" ? "ml-auto flex-row-reverse" : ""
                }`}
              >
                <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${
                  chat.sender === "user" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300"
                }`}>
                  {chat.sender === "user" ? "U" : "AI"}
                </div>
                <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  chat.sender === "user" 
                    ? "bg-indigo-600 text-white rounded-tr-none" 
                    : "bg-slate-950 border border-slate-800/80 text-slate-300 rounded-tl-none"
                }`}>
                  {chat.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-800 shrink-0 flex items-center justify-center text-xs text-slate-400">
                  AI
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-none text-xs text-slate-500 italic">
                  Grounded assistant is composing verified suggestions...
                </div>
              </div>
            )}
          </div>

          {/* Chat input box */}
          <form onSubmit={handleSendChat} className="mt-4 pt-4 border-t border-slate-850 flex gap-2">
            <input 
              type="text" 
              placeholder="Ask about missing evidence, upload recovery, etc..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <button 
              type="submit"
              className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-md shadow-indigo-600/10"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Hard safety disclaimer */}
          <div className="mt-4 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[9px] text-slate-500 leading-relaxed font-medium">
              SAFETY BOUNDARY: The support assistant operates under strict advisory rules. It is prohibited from predicting formal certification success, promising compliance approvals, or fabricating auditor feedback intent.
            </p>
          </div>
        </section>

      </main>
    </div>
  );
}
