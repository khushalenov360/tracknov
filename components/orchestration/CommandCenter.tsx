"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { 
  Bot, 
  Search, 
  Sparkles, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Clock, 
  User, 
  ArrowUpRight, 
  ShieldAlert, 
  Folder, 
  Calendar, 
  ChevronRight, 
  Plus, 
  Activity, 
  FileText, 
  Check, 
  Inbox, 
  AlertTriangle 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

// Constants & Hard Render Limits
const OPERATIONAL_GOVERNOR_CONFIG = {
  maxVisibleProjects: 5,
  maxVisibleTasksPerProject: 5,
  maxVisibleSections: 4,
  maxScrollDepth: "100vh",
  hideResolvedByDefault: true,
};

type MemberRole = "consultant" | "owner" | "project_admin" | "super_admin" | "super_user";

interface Project {
  id: string;
  name: string;
  client: string;
  location: string;
  certification_type: string;
  overallCompletion: number;
  status?: string;
  statusFlag: "green" | "amber" | "red";
  totalCredits: number;
  uploadedDocs: number;
  mandatoryCreditsMet: number;
  openRemarks: number;
  membersCount: number;
  role: MemberRole;
  documentCreditsRemaining?: number;
  documentCreditsUsed?: number;
}

interface ActionTask {
  id: string;
  projectId: string;
  projectName: string;
  projectCreditId: string;
  creditCode: string;
  creditName: string;
  documentType: string;
  status: string;
  priority: "high" | "medium" | "low";
  summary: string;
  type: "upload" | "review" | "clarification" | "blocker";
}

interface CommandCenterProps {
  user: { id: string; name: string; role: MemberRole; email: string } | null;
  initialProjects: Project[];
  actionQueue: any[];
  reviewQueue: any[];
  blockerQueue: any[];
  myTasks: any[];
  roleTasks: any[];
  insights: any;
}

export default function CommandCenter({
  user,
  initialProjects,
  actionQueue,
  reviewQueue,
  blockerQueue,
  myTasks,
  roleTasks,
  insights
}: CommandCenterProps) {
  const activeRole = user?.role ?? "consultant";
  
  // 1. Unified State Management
  const [searchQuery, setSearchQuery] = useState("");
  const [aiStatusMessage, setAiStatusMessage] = useState("");
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ActionTask | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "all" | "blockers">("active");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [clarificationText, setClarificationText] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<"approve" | "clarification" | null>(null);

  // 2. Synthesize & Normalize Tasks (AI-Compressed Operational Summaries)
  const normalizedTasks = useMemo<ActionTask[]>(() => {
    const list: ActionTask[] = [];

    // Synthesize Action Queue (Upload requests)
    actionQueue.forEach((item, idx) => {
      list.push({
        id: `upload-${item.projectCreditId || idx}`,
        projectId: item.projectId,
        projectName: item.projectName,
        projectCreditId: item.projectCreditId,
        creditCode: item.creditCode || "CHECKLIST",
        creditName: item.creditName || "Required Documentation",
        documentType: item.documentType || "PDF Evidence",
        status: "pending_upload",
        priority: "high",
        summary: `Provide missing ${item.documentType || "evidence file"} for ${item.creditCode} checklist validation.`,
        type: "upload"
      });
    });

    // Synthesize Review Queue (L1 Reviews needed)
    reviewQueue.forEach((item, idx) => {
      list.push({
        id: `review-${item.id || idx}`,
        projectId: item.project_id || item.projectId || "",
        projectName: item.projectName || "Active Project",
        projectCreditId: item.project_credit_id || "",
        creditCode: item.creditCode || "REVIEW",
        creditName: item.fileName || "Evidence Document",
        documentType: "Review",
        status: "pending_review",
        priority: "medium",
        summary: `Evaluate uploaded file "${item.fileName}" for compliance alignment.`,
        type: "review"
      });
    });

    // Synthesize Blocker Queue (Clarifications & Stalls)
    blockerQueue.forEach((item, idx) => {
      list.push({
        id: `blocker-${item.id || idx}`,
        projectId: item.projectId || "",
        projectName: item.projectName || "Active Project",
        projectCreditId: item.projectCreditId || "",
        creditCode: item.creditCode || "BLOCKER",
        creditName: item.fileName || "Clarification",
        documentType: "Clarification Needed",
        status: "stalled",
        priority: "high",
        summary: `Resolve open comment: "${item.reason || "Clarification requested by reviewer"}".`,
        type: "blocker"
      });
    });

    // Fallbacks from roleTasks if queues are light
    if (list.length === 0) {
      roleTasks.forEach((item, idx) => {
        list.push({
          id: `role-${item.id || idx}`,
          projectId: item.projectId || "",
          projectName: item.projectName || "Active Project",
          projectCreditId: item.projectCreditId || "",
          creditCode: "TASK",
          creditName: item.title || "Pending Duty",
          documentType: item.type || "Requirement",
          status: "pending",
          priority: item.priority === "high" ? "high" : "medium",
          summary: item.subtitle || "Fulfill pending documentation task.",
          type: item.type === "clarification_needed" ? "clarification" : "upload"
        });
      });
    }

    return list;
  }, [actionQueue, reviewQueue, blockerQueue, roleTasks]);

  // 3. AI Command Bar Intel Execution Engine
  const executeCommand = (command: string) => {
    if (!command.trim()) return;
    
    setIsProcessingAi(true);
    setAiStatusMessage("Analyzing intent...");

    const steps = [
      "Retrieving project context variables...",
      "Evaluating document compliance boundaries...",
      "Mapping execution pathways & priorities...",
      "Governance validation complete."
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setAiStatusMessage(steps[currentStep]);
        currentStep++;
      } else {
        clearInterval(interval);
        setIsProcessingAi(false);
        setAiStatusMessage("");

        const lower = command.toLowerCase();
        if (lower.includes("block") || lower.includes("stall")) {
          setActiveTab("blockers");
          setSearchQuery("");
        } else if (lower.includes("readiness") || lower.includes("summary")) {
          setSelectedTask(null);
          setSearchQuery("");
          // Open preflight readiness workspace
          const dummyTask: ActionTask = {
            id: "special-readiness",
            projectId: projects[0]?.id || "",
            projectName: projects[0]?.name || "All Projects",
            projectCreditId: "",
            creditCode: "READINESS",
            creditName: "Submission Readiness Preflight",
            documentType: "System Intel Report",
            status: "active",
            priority: "high",
            summary: "AI-generated comprehensive analysis of documentation completeness and stage-gate readiness.",
            type: "review"
          };
          setSelectedTask(dummyTask);
        } else if (lower.includes("ccil")) {
          setSearchQuery("ccil");
        } else if (lower.includes("bhavarkua")) {
          setSearchQuery("bhavarkua");
        } else if (lower.includes("assign") || lower.includes("deepa")) {
          alert(`AI Suggestion: Routed task to Deepa (Project Lead L3) for validation review.`);
        } else {
          setSearchQuery(command);
        }
      }
    }, 600);
  };

  // 4. Operational Rendering Governor filter logic
  const filteredTasksByProject = useMemo(() => {
    let result = normalizedTasks;

    if (activeTab === "blockers") {
      result = result.filter(t => t.type === "blocker" || t.priority === "high");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.projectName.toLowerCase().includes(q) || 
        t.creditCode.toLowerCase().includes(q) || 
        t.summary.toLowerCase().includes(q)
      );
    }

    // Group ONLY by Project (Mandatory limit: maxVisibleProjects = 5)
    const grouped: { [projName: string]: ActionTask[] } = {};
    result.forEach(task => {
      if (!grouped[task.projectName]) {
        grouped[task.projectName] = [];
      }
      // Mandatory limit: maxVisibleTasksPerProject = 5
      if (grouped[task.projectName].length < OPERATIONAL_GOVERNOR_CONFIG.maxVisibleTasksPerProject) {
        grouped[task.projectName].push(task);
      }
    });

    // Enforce maxVisibleProjects = 5
    const keys = Object.keys(grouped).slice(0, OPERATIONAL_GOVERNOR_CONFIG.maxVisibleProjects);
    const finalGrouped: { [projName: string]: ActionTask[] } = {};
    keys.forEach(k => {
      finalGrouped[k] = grouped[k];
    });

    return finalGrouped;
  }, [normalizedTasks, activeTab, searchQuery, projects]);

  const totalOutstandingTasks = useMemo(() => {
    return Object.values(filteredTasksByProject).reduce((sum, list) => sum + list.length, 0);
  }, [filteredTasksByProject]);

  // Handle task execution forms
  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceFile) return;

    setIsProcessingAi(true);
    setAiStatusMessage("Verifying file integrity & scanning low-VOC compliance parameters...");
    
    setTimeout(() => {
      setIsProcessingAi(false);
      setAiStatusMessage("");
      setUploadSuccess(true);
      setEvidenceFile(null);
      // Remove task from list mockingly
      if (selectedTask) {
        // Move task to completed/cleared state
        setTimeout(() => {
          setSelectedTask(null);
          setUploadSuccess(false);
        }, 2000);
      }
    }, 1800);
  };

  const handleClarificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarificationText.trim()) return;

    setIsProcessingAi(true);
    setAiStatusMessage("Transmitting draft response to Project Audit Logger...");
    
    setTimeout(() => {
      setIsProcessingAi(false);
      setAiStatusMessage("");
      setUploadSuccess(true);
      setClarificationText("");
      setTimeout(() => {
        setSelectedTask(null);
        setUploadSuccess(false);
      }, 2000);
    }, 1200);
  };

  const handleReviewDecision = (decision: "approve" | "clarification") => {
    setReviewDecision(decision);
    setIsProcessingAi(true);
    setAiStatusMessage(decision === "approve" ? "Signing cryptographic review ledger..." : "Drafting request for clarification...");
    
    setTimeout(() => {
      setIsProcessingAi(false);
      setAiStatusMessage("");
      setUploadSuccess(true);
      setTimeout(() => {
        setSelectedTask(null);
        setUploadSuccess(false);
        setReviewDecision(null);
      }, 2000);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      
      {/* 🚀 AICommandBar: Primary Interaction Layer */}
      <section className="bg-slate-900 border border-slate-850 p-4 rounded-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Bot className="h-4.5 w-4.5 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && executeCommand(searchQuery)}
                placeholder="Ask operational AI: 'Show blockers for CCIL', 'Generate readiness summary', or filter tasks..."
                className="w-full pl-10 pr-24 h-10 border-slate-800 bg-slate-950/80 text-[12px] text-slate-200 placeholder:text-slate-500 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500/30"
              />
              <button
                onClick={() => executeCommand(searchQuery)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[10px] font-black uppercase text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 rounded-md border border-indigo-500/20 transition-all"
              >
                Execute
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic status readout */}
        {isProcessingAi && (
          <div className="mt-2.5 flex items-center gap-2 text-[10px] text-indigo-400 font-mono pl-12">
            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
            <span>{aiStatusMessage}</span>
          </div>
        )}

        {/* Quick Intel Commands */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-12 text-[10px] text-slate-500">
          <span className="font-semibold uppercase tracking-wider text-[9px]">Suggest:</span>
          <button 
            onClick={() => { setSearchQuery("Show blockers"); executeCommand("Show blockers"); }}
            className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-400 transition-all hover:text-slate-200"
          >
            ⚠️ High Risks & Blockers
          </button>
          <button 
            onClick={() => { setSearchQuery("Generate readiness summary"); executeCommand("Generate readiness summary"); }}
            className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-400 transition-all hover:text-slate-200"
          >
            📊 Submission Readiness Preflight
          </button>
          <button 
            onClick={() => setSearchQuery("")}
            className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-400 transition-all hover:text-slate-200"
          >
            🔄 Reset Filters
          </button>
        </div>
      </section>

      {/* 2-COLUMN SPLIT COMMAND CONSOLE */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        
        {/* LEFT PANEL: OperationalProjectQueue */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
            <div className="flex items-center gap-2">
              <Inbox className="h-4.5 w-4.5 text-[var(--color-text-secondary)]" />
              <h2 className="text-[13px] font-bold text-[var(--color-text-primary)] uppercase tracking-wide">
                Operational Queue
              </h2>
            </div>
            <Badge className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-bold">
              {totalOutstandingTasks} Active
            </Badge>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-3 gap-1 bg-[var(--color-surface-2)] p-0.5 rounded-lg border border-[var(--color-border)]">
            <button
              onClick={() => setActiveTab("active")}
              className={`py-1 text-[10px] font-black uppercase rounded transition-all ${
                activeTab === "active" 
                  ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Action Items
            </button>
            <button
              onClick={() => setActiveTab("blockers")}
              className={`py-1 text-[10px] font-black uppercase rounded transition-all flex items-center justify-center gap-1 ${
                activeTab === "blockers" 
                  ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              ⚠️ Risks
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`py-1 text-[10px] font-black uppercase rounded transition-all ${
                activeTab === "all" 
                  ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Full Scope
            </button>
          </div>

          {/* Grouped Queue */}
          <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {Object.keys(filteredTasksByProject).length > 0 ? (
              Object.entries(filteredTasksByProject).map(([projName, taskList]) => (
                <div key={projName} className="space-y-2 border-l-2 border-[var(--color-border-strong)] pl-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1.5">
                      <Folder className="h-3 w-3" />
                      {projName}
                    </h3>
                    <Badge className="text-[8px] h-4.5 bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] font-semibold">
                      {taskList.length} items
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {taskList.map((task) => (
                      <article
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden group ${
                          selectedTask?.id === task.id
                            ? "bg-[var(--color-surface)] border-[var(--color-green)] shadow-md"
                            : "bg-[var(--color-surface-2)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <Badge className={`text-[8px] font-black uppercase tracking-wider h-4 px-1.5 ${
                            task.type === "blocker" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                            task.type === "review" ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" :
                            task.type === "clarification" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                            "bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
                          }`}>
                            {task.creditCode}
                          </Badge>
                          
                          <span className="text-[9px] text-[var(--color-text-tertiary)] font-semibold flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {task.priority === "high" ? "Urgent" : "Normal"}
                          </span>
                        </div>

                        {/* AI-Compressed operational summary - strictly no raw metadata */}
                        <p className="text-[11px] font-semibold text-[var(--color-text-primary)] line-clamp-2 leading-relaxed">
                          {task.summary}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-center text-slate-400">
                <Inbox className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                <p className="text-[11px] font-medium">No unresolved action items found matching parameters.</p>
              </div>
            )}
          </div>
        </section>

        {/* CENTER PANEL: ExecutionWorkspace */}
        <section className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-2xl p-5 min-h-[calc(100vh-280px)] relative overflow-hidden flex flex-col">
          
          {selectedTask ? (
            <div className="flex-1 flex flex-col justify-between space-y-6">
              
              {/* Workspace Header */}
              <div className="border-b border-[var(--color-border)] pb-4 space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black text-[var(--color-text-tertiary)] tracking-wider">
                    Execution Workspace Focus
                  </span>
                  <Badge className="bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] text-[9px] font-bold">
                    {selectedTask.projectName}
                  </Badge>
                </div>
                
                <h3 className="text-[14px] font-bold text-[var(--color-text-primary)]">
                  {selectedTask.creditCode}: {selectedTask.creditName}
                </h3>
              </div>

              {/* Workspace Main Body */}
              <div className="flex-1 text-left">
                
                {/* Simulated AI preflight recommendations */}
                <div className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] mb-5 space-y-3 relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-1 bg-indigo-500" />
                  <div className="flex items-start gap-2.5">
                    <Bot className="h-4.5 w-4.5 text-indigo-500 mt-0.5" />
                    <div>
                      <h4 className="text-[11px] font-black uppercase text-indigo-500 tracking-wider">AI Preflight Checklist</h4>
                      <p className="text-[11px] text-[var(--color-text-secondary)] mt-1 font-medium leading-relaxed">
                        Based on IGBC guidebook criteria for this category, documentation must demonstrate complete baseline compatibility. Ensure:
                      </p>
                      <ul className="mt-2 space-y-1 text-[10px] text-[var(--color-text-secondary)] list-disc pl-4 font-medium">
                        <li>Valid raw supplier certification attestation is attached.</li>
                        <li>Manufacturer baseline values map correctly to calculations.</li>
                        <li>No placeholder or unverified drafts exist within review packs.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Upload Action Flow */}
                {selectedTask.type === "upload" && (
                  <form onSubmit={handleFileUpload} className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                        Select Evidence Document
                      </label>
                      <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] p-6 text-center hover:border-[var(--color-border-strong)] transition-all cursor-pointer relative">
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          required
                        />
                        <div className="space-y-1.5 text-slate-400">
                          <FileText className="h-8 w-8 mx-auto text-slate-300" />
                          <p className="text-[11px] font-semibold text-[var(--color-text-primary)]">
                            {evidenceFile ? evidenceFile.name : "Click to select PDF evidence file"}
                          </p>
                          <p className="text-[9px]">PDF files up to 24MB approved</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setSelectedTask(null)}
                        className="text-[11px] hover:bg-slate-100"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={!evidenceFile || isProcessingAi}
                        className="rounded-xl px-4 py-2 text-[11px] bg-[var(--color-green)] text-white hover:bg-[var(--color-green-dim)] transition-all"
                      >
                        Upload and Ingest Evidence
                      </Button>
                    </div>
                  </form>
                )}

                {/* Clarification Action Flow */}
                {selectedTask.type === "clarification" && (
                  <form onSubmit={handleClarificationSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                        Respond to Comment Block
                      </label>
                      <textarea
                        value={clarificationText}
                        onChange={(e) => setClarificationText(e.target.value)}
                        placeholder="Provide details requested by reviewer..."
                        rows={4}
                        required
                        className="w-full p-3 border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] text-[var(--color-text-primary)] rounded-xl outline-none focus:border-[var(--color-border-strong)] resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setSelectedTask(null)}
                        className="text-[11px]"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={!clarificationText.trim() || isProcessingAi}
                        className="rounded-xl px-4 py-2 text-[11px] bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
                      >
                        Submit Response & Clear Blocker
                      </Button>
                    </div>
                  </form>
                )}

                {/* Review Flow (L1 Approver Roles) */}
                {selectedTask.type === "review" && selectedTask.id !== "special-readiness" && (
                  <div className="space-y-4">
                    <p className="text-[11px] font-medium text-[var(--color-text-secondary)] leading-relaxed">
                      Verify that the uploaded compliance evidence maps strictly to standard requirements. Review baseline values in details.
                    </p>

                    <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4.5 w-4.5 text-[var(--color-text-secondary)]" />
                        <span className="font-semibold text-[var(--color-text-primary)]">
                          {selectedTask.creditName}
                        </span>
                      </div>
                      <a 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); alert("Mock Open PDF viewer"); }}
                        className="text-[var(--color-green)] font-semibold hover:underline"
                      >
                        View File
                      </a>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
                      <Button
                        onClick={() => handleReviewDecision("clarification")}
                        variant="secondary"
                        disabled={isProcessingAi}
                        className="rounded-xl text-[11px] border-[var(--color-border)]"
                      >
                        Request Clarification
                      </Button>
                      <Button
                        onClick={() => handleReviewDecision("approve")}
                        disabled={isProcessingAi}
                        className="rounded-xl text-[11px] bg-[var(--color-green)] text-white hover:bg-[var(--color-green-dim)]"
                      >
                        Approve Document
                      </Button>
                    </div>
                  </div>
                )}

                {/* Readiness Preflight Intel Report */}
                {selectedTask.id === "special-readiness" && (
                  <div className="space-y-4">
                    <SubmissionRiskPanel projects={projects} stuckItems={insights.stuckItems} />
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => setSelectedTask(null)}
                        variant="ghost"
                        className="text-[11px]"
                      >
                        Close Readiness Report
                      </Button>
                    </div>
                  </div>
                )}

                {/* Submission Success Alert */}
                {uploadSuccess && (
                  <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl flex items-center gap-2 text-[11px] font-semibold animate-pulse">
                    <Check className="h-4.5 w-4.5" />
                    <span>Action successfully executed and recorded on audit ledger! Workspace updated.</span>
                  </div>
                )}

              </div>
            </div>
          ) : (
            // Default Focused State: High level Portfolio Health Matrix
            <div className="flex-1 flex flex-col justify-between space-y-6">
              
              <div className="text-left space-y-1.5 border-b border-[var(--color-border)] pb-4">
                <span className="text-[10px] uppercase font-black text-[var(--color-text-tertiary)] tracking-wider">
                  Operational Dashboard Focus
                </span>
                <h3 className="text-[14px] font-bold text-[var(--color-text-primary)]">
                  Portfolio Health Map
                </h3>
              </div>

              {/* Project Health Strips */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-340px)] pr-1">
                {projects.slice(0, 4).map((proj) => (
                  <ProjectHealthStrip key={proj.id} project={proj} />
                ))}
              </div>

              {/* Bottom guidance hint */}
              <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl flex items-center justify-between text-[11px] text-[var(--color-text-secondary)] font-medium">
                <div className="flex items-center gap-2">
                  <Bot className="h-4.5 w-4.5 text-indigo-500" />
                  <span>Select any action item from the left queue to begin work.</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </div>

            </div>
          )}

        </section>

      </div>
    </div>
  );
}

// 📦 ProjectHealthStrip Sub-Component
function ProjectHealthStrip({ project }: { project: Project }) {
  return (
    <article className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-xl space-y-2.5 text-left transition-all hover:border-[var(--color-border-strong)]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h4 className="text-[12px] font-bold text-[var(--color-text-primary)]">
            {project.name}
          </h4>
          <span className="text-[9px] text-[var(--color-text-tertiary)] font-semibold uppercase">
            {project.certification_type} / {project.location}
          </span>
        </div>

        <Badge className={`text-[8px] font-black uppercase tracking-wider h-4 px-1.5 ${
          project.statusFlag === "red" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
          project.statusFlag === "amber" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
          "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
        }`}>
          {project.statusFlag === "red" ? "🚨 Delayed" : project.statusFlag === "amber" ? "⚠️ Warning" : " On Track"}
        </Badge>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-center text-[10px] font-semibold text-[var(--color-text-secondary)]">
          <span>Overall completion velocity</span>
          <span className="mono">{project.overallCompletion}%</span>
        </div>
        <Progress value={project.overallCompletion} />
      </div>

      <div className="pt-2 flex justify-between items-center gap-2 border-t border-[var(--color-border)] text-[9px] font-semibold text-[var(--color-text-tertiary)]">
        <span>{project.uploadedDocs}/{project.totalCredits} checklist items done</span>
        <Link href={`/projects/${project.id}`} className="text-[var(--color-green)] hover:underline flex items-center gap-0.5">
          Workspace View <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </article>
  );
}

// 📦 SubmissionRiskPanel Sub-Component
function SubmissionRiskPanel({ projects, stuckItems }: { projects: Project[]; stuckItems: any[] }) {
  return (
    <div className="space-y-4 text-left">
      <div className="flex items-center gap-2 text-indigo-500">
        <Sparkles className="h-4.5 w-4.5 animate-pulse" />
        <h4 className="text-[12px] font-black uppercase tracking-wider">Submission Preflight Readiness Analysis</h4>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl space-y-1">
          <span className="text-[9px] uppercase font-black text-slate-500 block">Overall Target Confidence</span>
          <strong className="text-[13px] text-[var(--color-text-primary)] block">High Readiness Probability</strong>
          <span className="text-[9px] text-[var(--color-text-tertiary)] block">86% of mandatory metrics fully met.</span>
        </div>

        <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl space-y-1">
          <span className="text-[9px] uppercase font-black text-slate-500 block">Identified High-Risk Hotspots</span>
          <strong className="text-[13px] text-rose-500 block">1 Bottleneck Cluster</strong>
          <span className="text-[9px] text-[var(--color-text-tertiary)] block">2 projects experiencing HVAC verification delays.</span>
        </div>
      </div>

      {stuckItems.length > 0 && (
        <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500 uppercase tracking-wider">
            <ShieldAlert className="h-3.5 w-3.5" />
            Top Blocking Vulnerability
          </div>
          <p className="text-[11px] text-[var(--color-text-secondary)] font-medium leading-normal">
            <strong>{stuckItems[0].projectName || "CCIL Workspace"}</strong>: Missing {stuckItems[0].missingDoc || "Simulation Report"} for credit {stuckItems[0].creditCode || "HVAC-01"}. Assigned to {stuckItems[0].responsibleRole || "Vendor"}.
          </p>
        </div>
      )}

      <div className="space-y-1">
        <h5 className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Checklist Readiness Index</h5>
        <div className="space-y-1.5">
          {projects.slice(0, 3).map(p => (
            <div key={p.id} className="flex justify-between items-center text-[10px] font-mono text-[var(--color-text-secondary)]">
              <span className="truncate max-w-[200px]">{p.name}</span>
              <span className="font-semibold">{Math.round(p.overallCompletion)}% Completeness</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
