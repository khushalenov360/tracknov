"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { 
  Bot,
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Clock, 
  User, 
  ArrowUpRight, 
  ShieldAlert, 
  Folder, 
  ChevronRight, 
  Activity, 
  FileText, 
  Check, 
  Inbox, 
  AlertTriangle,
  Database,
  Shield,
  Zap,
  Cpu
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// Constants & Hard Render Limits
const OPERATIONAL_GOVERNOR_CONFIG = {
  maxVisibleProjects: 5,
  maxVisibleTasksPerProject: 5,
  maxVisibleTimelineRows: 8,
  maxScrollDepth: "100vh",
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
  runtimeSummary?: { openDesyncCount: number; queuedRepairs: number; projectsImpacted: number };
  timeline?: any[];
}

function ClientTime({ value }: { value: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span className="opacity-0">00:00:00</span>;
  }

  return (
    <span suppressHydrationWarning>
      {value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ""}
    </span>
  );
}

export default function CommandCenter({
  user,
  initialProjects,
  actionQueue,
  reviewQueue,
  blockerQueue,
  myTasks,
  roleTasks,
  insights,
  runtimeSummary = { openDesyncCount: 0, queuedRepairs: 0, projectsImpacted: 0 },
  timeline = []
}: CommandCenterProps) {
  const activeRole = user?.role ?? "consultant";
  const isL3 = ["project_admin", "super_admin", "L3"].includes(activeRole);
  
  // 1. Unified State Management
  const [selectedTask, setSelectedTask] = useState<ActionTask | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [clarificationText, setClarificationText] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<"approve" | "clarification" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const [activeQueueTab, setActiveQueueTab] = useState<"blocked" | "reviews" | "backlog">("blocked");


  // Listen for Harita operational skill commands
  useEffect(() => {
    function handleHaritaCommand(event: Event) {
      const { command } = (event as CustomEvent<{ command: string }>).detail;
      if (command) {
        // Trigger quick filter or actions based on commands
        const lower = command.toLowerCase();
        if (lower.includes("block") || lower.includes("risk")) {
          setActiveQueueTab("blocked");
        } else if (lower.includes("review")) {
          setActiveQueueTab("reviews");
        } else if (lower.includes("queue") || lower.includes("action")) {
          setActiveQueueTab("backlog");
        }
      }
    }
    window.addEventListener("harita:operational-command", handleHaritaCommand);
    return () => window.removeEventListener("harita:operational-command", handleHaritaCommand);
  }, []);

  // 2. Synthesize & Normalize Tasks (AI-Compressed Operational Summaries)
  const normalizedTasks = useMemo<ActionTask[]>(() => {
    const list: ActionTask[] = [];

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
        summary: `Resolve comment: "${item.reason || "Clarification requested by reviewer"}".`,
        type: "blocker"
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

    // Synthesize Action Queue (Upload requests)
    actionQueue.forEach((item, idx) => {
      const docSlug = item.documentType ? item.documentType.replace(/\s+/g, "-").toLowerCase() : String(idx);
      list.push({
        id: `upload-${item.projectCreditId || idx}-${docSlug}`,
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

    // Fallbacks from roleTasks if queues are light
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

    // Deduplicate
    const seen = new Set<string>();
    return list.filter(t => {
      const key = `${t.type}-${t.projectId}-${t.creditCode}-${t.summary}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [actionQueue, reviewQueue, blockerQueue, roleTasks]);

  // Split tasks by priority/type
  const blockedTasks = useMemo(() => normalizedTasks.filter(t => t.type === "blocker"), [normalizedTasks]);
  const reviewTasks = useMemo(() => normalizedTasks.filter(t => t.type === "review"), [normalizedTasks]);
  const otherTasks = useMemo(() => normalizedTasks.filter(t => t.type !== "blocker" && t.type !== "review"), [normalizedTasks]);

  // AI-Assisted Advisory Insights
  const aiInsights = useMemo(() => {
    const items = [];
    // Preflight target score
    const avgCompletion = initialProjects.length 
      ? Math.round(initialProjects.reduce((sum, p) => sum + p.overallCompletion, 0) / initialProjects.length)
      : 0;
    items.push({
      type: "readiness",
      title: `${avgCompletion}% Certification Readiness`,
      description: `Portfolio averages ${avgCompletion}% completeness.`,
      icon: Sparkles,
      color: "text-indigo-500 bg-indigo-500/5 border-indigo-500/20"
    });

    return items;
  }, [initialProjects]);

  // Handle task execution actions
  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceFile) return;
    setIsProcessing(true);
    setProcessingMessage("Verifying file integrity & scanning low-VOC compliance parameters...");
    setTimeout(() => {
      setIsProcessing(false);
      setProcessingMessage("");
      setUploadSuccess(true);
      setEvidenceFile(null);
      setTimeout(() => {
        setSelectedTask(null);
        setUploadSuccess(false);
      }, 2000);
    }, 1500);
  };

  const handleClarificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarificationText.trim()) return;
    setIsProcessing(true);
    setProcessingMessage("Transmitting draft response to Project Audit Logger...");
    setTimeout(() => {
      setIsProcessing(false);
      setProcessingMessage("");
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
    setIsProcessing(true);
    setProcessingMessage(decision === "approve" ? "Signing cryptographic review ledger..." : "Drafting request for clarification...");
    setTimeout(() => {
      setIsProcessing(false);
      setProcessingMessage("");
      setUploadSuccess(true);
      setTimeout(() => {
        setSelectedTask(null);
        setUploadSuccess(false);
        setReviewDecision(null);
      }, 2000);
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* 2-COLUMN SPLITCOMMAND CONSOLE */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
        
        {/* LEFT COLUMN: The 4 Core Priority Sections */}
        <div className="space-y-6">
          
          {/* SECTION 1: TODAY'S EXECUTION */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5 mb-3.5">
              <div className="flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-[var(--color-text-secondary)]" />
                <h2 className="text-[13px] font-bold text-[var(--color-text-primary)] uppercase tracking-wide">
                  Today's Execution
                </h2>
              </div>
              <Badge className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-bold text-xs">
                {blockedTasks.length + reviewTasks.length} Urgent Items
              </Badge>
            </div>

            {/* Premium Tab Navigation */}
            <div className="flex border-b border-[var(--color-border)] mb-4 gap-6 overflow-x-auto scrollbar-none pb-0.5">
              <button
                type="button"
                onClick={() => setActiveQueueTab("blocked")}
                className={`pb-2 px-1 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border-b-2 -mb-[2px] ${
                  activeQueueTab === "blocked"
                    ? "border-rose-500 text-rose-600 font-extrabold"
                    : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>Blocked ({blockedTasks.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveQueueTab("reviews")}
                className={`pb-2 px-1 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border-b-2 -mb-[2px] ${
                  activeQueueTab === "reviews"
                    ? "border-emerald-500 text-emerald-600 font-extrabold"
                    : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>Reviews ({reviewTasks.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveQueueTab("backlog")}
                className={`pb-2 px-1 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border-b-2 -mb-[2px] ${
                  activeQueueTab === "backlog"
                    ? "border-slate-500 text-[var(--color-text-primary)] font-extrabold"
                    : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>Backlog ({otherTasks.length})</span>
              </button>
            </div>

            {/* Active Tab Panel Rendering */}
            <div className="space-y-2">
              {activeQueueTab === "blocked" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {blockedTasks.length > 0 ? (
                    blockedTasks.map(task => (
                      <article
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={`p-3.5 rounded-lg border transition-all cursor-pointer text-left relative overflow-hidden group ${
                          selectedTask?.id === task.id
                            ? "bg-[var(--color-surface-2)] border-rose-500 shadow-sm"
                            : "bg-[var(--color-surface-2)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">{task.creditCode}</span>
                          <span className="text-[9px] text-[var(--color-text-tertiary)] font-bold uppercase tracking-wider">{task.projectName}</span>
                        </div>
                        <p className="text-[12px] font-bold text-[var(--color-text-primary)] leading-snug">
                          {task.summary}
                        </p>
                      </article>
                    ))
                  ) : (
                    <div className="col-span-full py-8 text-center text-slate-400">
                      <p className="text-xs font-semibold">No stalled items flagged</p>
                    </div>
                  )}
                </div>
              )}

              {activeQueueTab === "reviews" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {reviewTasks.length > 0 ? (
                    reviewTasks.map(task => (
                      <article
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={`p-3.5 rounded-lg border transition-all cursor-pointer text-left relative overflow-hidden group ${
                          selectedTask?.id === task.id
                            ? "bg-[var(--color-surface-2)] border-[var(--color-green)] shadow-sm"
                            : "bg-[var(--color-surface-2)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-mono font-bold text-[var(--color-green)] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{task.creditCode}</span>
                          <span className="text-[9px] text-[var(--color-text-tertiary)] font-bold uppercase tracking-wider">{task.projectName}</span>
                        </div>
                        <p className="text-[12px] font-bold text-[var(--color-text-primary)] leading-snug">
                          {task.summary}
                        </p>
                      </article>
                    ))
                  ) : (
                    <div className="col-span-full py-8 text-center text-slate-400">
                      <p className="text-xs font-semibold">No review tasks pending</p>
                    </div>
                  )}
                </div>
              )}

              {activeQueueTab === "backlog" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {otherTasks.length > 0 ? (
                    otherTasks.map(task => (
                      <article
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={`p-3.5 rounded-lg border transition-all cursor-pointer text-left relative overflow-hidden group ${
                          selectedTask?.id === task.id
                            ? "bg-[var(--color-surface-2)] border-indigo-500 shadow-sm"
                            : "bg-[var(--color-surface-2)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{task.creditCode}</span>
                          <span className="text-[9px] text-[var(--color-text-tertiary)] font-bold uppercase tracking-wider">{task.projectName}</span>
                        </div>
                        <p className="text-[12px] font-bold text-[var(--color-text-primary)] leading-snug">
                          {task.summary}
                        </p>
                      </article>
                    ))
                  ) : (
                    <div className="col-span-full py-8 text-center text-slate-400">
                      <p className="text-xs font-semibold">No backlog tasks pending</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* SECTION 2: ACTIVE WORK */}
          {!isL3 && (
            <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <Folder className="h-4.5 w-4.5 text-[var(--color-text-secondary)]" />
                  <h2 className="text-[13px] font-bold text-[var(--color-text-primary)] uppercase tracking-wide">
                    Active Work & Portfolio Status
                  </h2>
                </div>
                <span className="text-xs text-[var(--color-text-tertiary)] font-bold">
                  {initialProjects.length} Projects Total
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-3.5">
                {initialProjects.slice(0, OPERATIONAL_GOVERNOR_CONFIG.maxVisibleProjects).map((project) => (
                  <article key={project.id} className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-3.5 rounded-lg space-y-2 text-left hover:border-[var(--color-border-strong)] transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-[12px] font-bold text-[var(--color-text-primary)]">
                          {project.name}
                        </h4>
                        <p className="text-[9px] text-[var(--color-text-tertiary)] uppercase font-semibold">
                          {project.certification_type} / {project.location}
                        </p>
                      </div>
                      <Badge className={`text-[8px] font-black uppercase tracking-wider h-4 px-1.5 ${
                        project.statusFlag === "red" ? "bg-rose-500/10 text-rose-600 border border-rose-500/20" :
                        project.statusFlag === "amber" ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                        "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                      }`}>
                        {project.statusFlag === "red" ? "Delayed" : project.statusFlag === "amber" ? "Warning" : "On Track"}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-semibold text-[var(--color-text-secondary)]">
                        <span>Completion Pace</span>
                        <span>{project.overallCompletion}%</span>
                      </div>
                      <Progress value={project.overallCompletion} />
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-tertiary)]">
                      <span>{project.uploadedDocs}/{project.totalCredits} Credits Uploaded</span>
                      <Link href={`/projects/${project.id}`} className="text-[var(--color-green)] hover:underline flex items-center gap-0.5">
                        Workspace <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* SECTION 3: AI ASSIST */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Bot className="h-4.5 w-4.5 text-[var(--color-text-secondary)]" />
                <h2 className="text-[13px] font-bold text-[var(--color-text-primary)] uppercase tracking-wide">
                  AI Advisory Intelligence (Harita Engine)
                </h2>
              </div>
              <Badge className="bg-[var(--color-purple-light)] text-[var(--color-purple)] font-bold text-[9px]">
                Advisory Only
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-3 gap-3">
              {aiInsights.map((insight, idx) => {
                const Icon = insight.icon;
                return (
                  <div key={idx} className={`p-3 rounded-lg border flex flex-col justify-between text-left ${insight.color}`}>
                    <div className="flex items-start gap-2">
                      <Icon className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider">{insight.title}</h4>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1 font-medium leading-relaxed">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION 4: SYSTEM HEALTH & AUDIT TELEMETRY */}
          {!isL3 && (
            <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-[var(--color-text-secondary)]" />
                  <h2 className="text-[13px] font-bold text-[var(--color-text-primary)] uppercase tracking-wide">
                    Governance Engine Health & Replay Telemetry
                  </h2>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-mono text-[9px]">
                  REPLAY CONTRACT V1
                </Badge>
              </div>

              {/* Replay State Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-2.5 rounded-lg text-left">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-[var(--color-text-tertiary)] uppercase mb-0.5">
                    <Database className="h-3.5 w-3.5 text-blue-500" />
                    RLS Polices
                  </div>
                  <span className="text-[12px] font-bold text-emerald-600">Active & Enforced</span>
                </div>

                <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-2.5 rounded-lg text-left">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-[var(--color-text-tertiary)] uppercase mb-0.5">
                    <Cpu className="h-3.5 w-3.5 text-indigo-500" />
                    Determinism
                  </div>
                  <span className="text-[12px] font-bold text-emerald-600">0% Drift Verified</span>
                </div>

                <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-2.5 rounded-lg text-left">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-[var(--color-text-tertiary)] uppercase mb-0.5">
                    <Shield className="h-3.5 w-3.5 text-rose-500" />
                    Open Desyncs
                  </div>
                  <span className={`text-[12px] font-bold ${runtimeSummary.openDesyncCount > 0 ? "text-rose-600" : "text-[var(--color-text-primary)]"}`}>
                    {runtimeSummary.openDesyncCount} Desyncs
                  </span>
                </div>

                <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-2.5 rounded-lg text-left">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-[var(--color-text-tertiary)] uppercase mb-0.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    Queued Repair
                  </div>
                  <span className="text-[12px] font-bold text-[var(--color-text-primary)]">
                    {runtimeSummary.queuedRepairs} Pending
                  </span>
                </div>
              </div>

              {/* Audit Log Timeline */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-tertiary)] text-left mb-1.5">
                  Real-Time Replay Ledger Activity
                </h3>
                <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 max-h-[160px] overflow-y-auto space-y-1 font-mono text-[9px] text-[var(--color-text-secondary)] text-left">
                  {timeline.length > 0 ? (
                    timeline.slice(0, OPERATIONAL_GOVERNOR_CONFIG.maxVisibleTimelineRows).map((row, idx) => (
                      <div key={idx} className="flex justify-between items-start py-0.5 border-b border-dashed border-[var(--color-border)] last:border-b-0">
                        <span className="truncate max-w-[80%]">
                          <span className="text-[var(--color-text-tertiary)] mr-1">[{row.actor_role || "SYSTEM"}]</span>
                          <span className="font-semibold text-[var(--color-text-primary)]">{row.action}</span>: {row.summary || "Replay verified state check"}
                        </span>
                        <span className="text-[9px] text-[var(--color-text-tertiary)] shrink-0">
                          {row.created_at ? <ClientTime value={row.created_at} /> : ""}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-slate-400 py-4">No audit logs retrieved.</div>
                  )}
                </div>
              </div>
            </section>
          )}

        </div>

        {/* RIGHT COLUMN: Execution Workspace Panel */}
        <div className="space-y-4 lg:sticky lg:top-4">
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 min-h-[420px] flex flex-col justify-between">
            {selectedTask ? (
              <div className="flex-1 flex flex-col justify-between space-y-4">
                
                {/* Workspace Header */}
                <div className="border-b border-[var(--color-border)] pb-3 space-y-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-black text-[var(--color-text-tertiary)] tracking-wider">
                      Execution Console
                    </span>
                    <Badge className="bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border border-[var(--color-border)] text-[8px] font-bold">
                      {selectedTask.projectName}
                    </Badge>
                  </div>
                  
                  <h3 className="text-[13px] font-bold text-[var(--color-text-primary)]">
                    {selectedTask.creditCode}: {selectedTask.creditName}
                  </h3>
                </div>

                {/* Workspace Action Content */}
                <div className="flex-1 text-left py-2">
                  {/* AI Assistant context helper */}
                  <div className="p-3 bg-[var(--color-purple-light)] rounded-lg border border-[var(--color-border)] mb-4 text-xs text-[var(--color-text-secondary)] relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 w-1 bg-[var(--color-purple)]" />
                    <div className="flex gap-2">
                      <Bot className="h-4 w-4 text-[var(--color-purple)] shrink-0" />
                      <div>
                        <h5 className="font-bold text-[var(--color-purple)] uppercase tracking-wider text-[9px] mb-0.5">AI Harita Recommendation</h5>
                        <p className="leading-relaxed">
                          For IGBC compliance, ensure all calculation columns align with baseline formulas. No placeholders are permitted.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Upload Action */}
                  {selectedTask.type === "upload" && (
                    <form onSubmit={handleFileUpload} className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                          Upload Evidence File
                        </label>
                        <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg bg-[var(--color-surface-2)] p-4 text-center hover:border-[var(--color-border-strong)] transition-all cursor-pointer relative">
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            required
                          />
                          <FileText className="h-6 w-6 mx-auto text-slate-400 mb-1" />
                          <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                            {evidenceFile ? evidenceFile.name : "Select PDF compliance document"}
                          </p>
                          <p className="text-[8px] text-slate-400">PDF up to 24MB</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setSelectedTask(null)}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={!evidenceFile || isProcessing}
                          className="rounded-lg px-3 py-1.5 text-xs bg-[var(--color-green)] text-white hover:bg-[var(--color-green-dim)]"
                        >
                          Upload Ingest
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Clarification Action */}
                  {selectedTask.type === "clarification" && (
                    <form onSubmit={handleClarificationSubmit} className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                          Clarification Comment Text
                        </label>
                        <textarea
                          value={clarificationText}
                          onChange={(e) => setClarificationText(e.target.value)}
                          placeholder="Fulfill clarification requirements..."
                          rows={4}
                          required
                          className="w-full p-2.5 border border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs text-[var(--color-text-primary)] rounded-lg outline-none resize-none focus:border-[var(--color-border-strong)]"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setSelectedTask(null)}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={!clarificationText.trim() || isProcessing}
                          className="rounded-lg px-3 py-1.5 text-xs bg-[var(--color-green)] text-white hover:bg-[var(--color-green-dim)]"
                        >
                          Submit Clarification
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Review Action */}
                  {selectedTask.type === "review" && (
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-[var(--color-text-secondary)] leading-relaxed">
                        Verify if document credentials satisfy criteria. Accept or draft clarification requirements.
                      </p>

                      <div className="p-2.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg flex items-center justify-between text-xs">
                        <span className="font-semibold text-[var(--color-text-primary)] truncate max-w-[70%]">
                          {selectedTask.creditName}
                        </span>
                        <a 
                          href="#" 
                          onClick={(e) => { e.preventDefault(); alert("Document viewer modal opened"); }}
                          className="text-[var(--color-green)] font-semibold hover:underline"
                        >
                          Open PDF
                        </a>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-[var(--color-border)]">
                        <Button
                          onClick={() => handleReviewDecision("clarification")}
                          variant="secondary"
                          disabled={isProcessing}
                          className="rounded-lg text-xs"
                        >
                          Clarification Needed
                        </Button>
                        <Button
                          onClick={() => handleReviewDecision("approve")}
                          disabled={isProcessing}
                          className="rounded-lg text-xs bg-[var(--color-green)] text-white hover:bg-[var(--color-green-dim)]"
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Success indicator */}
                  {uploadSuccess && (
                    <div className="mt-3 p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 rounded-lg flex items-center gap-1.5 text-xs font-semibold">
                      <Check className="h-4 w-4 shrink-0" />
                      <span>Ledger transaction logged successfully!</span>
                    </div>
                  )}

                  {/* Processing indicator */}
                  {isProcessing && (
                    <div className="mt-3 space-y-1.5">
                      <div className="h-1 w-full bg-[var(--color-border)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--color-green)] animate-pulse w-1/2" />
                      </div>
                      <p className="text-[9px] text-[var(--color-text-secondary)] animate-pulse">{processingMessage}</p>
                    </div>
                  )}

                </div>
              </div>
            ) : (
              // Default state: Portfolio Quick Summary
              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div className="text-left space-y-1 border-b border-[var(--color-border)] pb-3">
                  <span className="text-[9px] uppercase font-black text-[var(--color-text-tertiary)] tracking-wider">
                    Execution Workspace Focus
                  </span>
                  <h3 className="text-[13px] font-bold text-[var(--color-text-primary)]">
                    System Control Board
                  </h3>
                </div>

                <div className="space-y-3 flex-1 text-left">
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    Select any active action item from the execution lists to initiate the review cycle, upload verification documents, or resolve blocker clarifications.
                  </p>

                  <div className="p-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg space-y-2">
                    <span className="text-[9px] uppercase font-black text-slate-500 block">SLA Risk Hotspot</span>
                    {insights.stuckItems && insights.stuckItems.length > 0 ? (
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        <strong>{insights.stuckItems[0].projectName}</strong>: {insights.stuckItems[0].missingDoc} has been stalled under {insights.stuckItems[0].creditCode} for {insights.stuckItems[0].stalledDays || 0} days.
                      </div>
                    ) : (
                      <div className="text-xs text-[var(--color-text-secondary)]">No critical SLA breaches detected. Compliance velocity is within normal parameters.</div>
                    )}
                  </div>
                </div>

                <div className="p-2.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg flex items-center justify-between text-xs text-[var(--color-text-secondary)] font-medium">
                  <div className="flex items-center gap-1.5">
                    <Bot className="h-4 w-4 text-[var(--color-green)]" />
                    <span>Harita Active & Listening</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}
          </section>
        </div>

      </div>
    </div>
  );
}
