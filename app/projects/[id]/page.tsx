import Link from "next/link";
import { AlertTriangle, CheckCircle2, Circle, Download, FileWarning, ShieldCheck } from "lucide-react";
import {
  addRemarkAction,
  createValidationRuleAction,
  assignCreditContributorAction,
  importProjectTrackerBaselineAction,
  setCreditStateAction,
  uploadProjectGuidebookAction,
  updateCreditGuidanceAction,
  updateCreditDocumentRequirementsAction,
  createTaskAction,
} from "@/app/actions";
import { AiGuidePanel } from "@/components/assistant/ai-guide-panel";
import { StageGateTracker } from "@/components/project/StageGateTracker";
import { TaskDetailPanel } from "@/components/project/TaskDetailPanel";
import { MatrixAssignmentDropdown } from "@/components/project/MatrixAssignmentDropdown";
import { UploadDocumentForm } from "@/components/project/upload-document-form";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type { AssistantContext } from "@/lib/assistant";
import { categoryMeta, creditStatuses } from "@/lib/constants";
import { creditStats, getCurrentUser, getProjectWorkspace } from "@/lib/data";
import { env } from "@/lib/env";
import { canManageProjectGuidebook, canReviewProjectDocuments, canUploadProjectDocuments, canAssignTasks } from "@/lib/rbac";
import {
  formatDateIST,
  formatDateTimeIST,
  pct,
  cleanRoleLabel,
} from "@/lib/utils";
import { stageGateService } from "@/lib/services/stage-gate-service";
import { resolveTrackerCellStatus, toLegacyCreditStatus } from "@/lib/workflow-utils";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    category?: string;
    status?: string;
    credit?: string;
    error?: string;
    success?: string;
    tab?: string;
  }>;
};

const docAbbreviations: Record<string, string> = {
  Narrative: "NAR",
  "Tech Spec": "SPEC",
  "Certificate/Declaration": "CERT",
  Drawing: "DWG",
  "Calculation & Tables": "CALC",
  Invoice: "INV",
  "Pic/Video": "PHOTO",
};

const trackerColumns = [
  { label: "Narrative", aliases: ["Narrative"] },
  { label: "Tech Specs", aliases: ["Tech Spec", "Tech Specs"] },
  { label: "Certificates", aliases: ["Certificate/Declaration", "Certificates/ Declaration", "Certificate"] },
  { label: "Drawings", aliases: ["Drawing", "Drawings"] },
  { label: "Calculations", aliases: ["Calculation & Tables", "Calculations & Tables", "Calculation"] },
  { label: "Financials", aliases: ["Invoice", "Invoices", "Purchase Order", "PO"] },
  { label: "Field Logs", aliases: ["Pic/Video", "Photo", "Video", "Logbook", "Site visit report"] },
  { label: "Audit Reports", aliases: ["Report", "Reports", "Audit report"] },
] as const;

const defaultCategoryMeta = {
  dot: "bg-[var(--color-text-tertiary)]",
  color: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
};

// resolveTrackerCellStatus and toLegacyCreditStatus moved to shared utils

function queryString(params: Record<string, string | undefined>) {
  const nextParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      nextParams.set(key, value);
    }
  });
  const stringValue = nextParams.toString();
  return stringValue ? `?${stringValue}` : "";
}

function mandatoryCode(creditCode: string, mandatory: boolean) {
  if (!mandatory || creditCode.includes("MR")) {
    return creditCode;
  }
  const parts = creditCode.split(" ");
  return `${parts[0]} MR ${parts.slice(1).join(" ")}`.trim();
}

export default async function ProjectPage({ params, searchParams }: PageProps) {
  const { id: projectId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  
  const user = await getCurrentUser();
  let workspaceError: string | null = null;
  let workspace = null as Awaited<ReturnType<typeof getProjectWorkspace>>;
  try {
    workspace = await getProjectWorkspace(projectId);
  } catch (error: any) {
    workspaceError = error?.message ?? "Could not load project workspace.";
  }
  if (workspaceError) {
    return (
      <Shell title="Project Workspace" description="Workspace could not be loaded." role="consultant" notificationCount={0}>
        <div className="surface-card p-8">
          <p className="text-[14px] font-medium text-[var(--color-text-primary)]">Workspace load failed</p>
          <p className="mt-2 text-[12px] text-[var(--color-red)]">{workspaceError}</p>
          <div className="mt-4">
            <Link href="/projects">
              <Button variant="secondary">Back to Projects</Button>
            </Link>
          </div>
        </div>
      </Shell>
    );
  }
  if (!workspace) {
    return (
      <Shell title="Project Not Found" description="The requested project could not be found." role="consultant" notificationCount={0}>
        <div className="surface-card p-8 text-center">
          <p className="text-[14px] text-[var(--color-text-secondary)]">
            Project not found or you do not have access.
          </p>
          <Link href="/dashboard">
            <Button variant="secondary" className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </Shell>
    );
  }
  const isL0Contributor = ["mep", "architect", "contractor"].includes(workspace.userRole);
  const canReview = canReviewProjectDocuments(workspace.userRole);
  const canUpload = canUploadProjectDocuments(workspace.userRole);
  const canManageGuidebook = canManageProjectGuidebook(workspace.userRole);
  const canOwnerReview = ["owner", "super_user", "L1", "L5"].includes(workspace.userRole);
  const canFinalReview = ["project_admin", "super_admin", "super_user", "L3", "L5"].includes(workspace.userRole);
  const canConfigureDocRequirements = ["project_admin", "super_user", "L3", "L5"].includes(workspace.userRole);
  const canAssignContributors = ["owner", "project_admin", "super_admin", "super_user", "L1", "L3", "L5"].includes(workspace.userRole);
  const contributorMembers = workspace.members;
  const roleScopedCredits = isL0Contributor
    ? workspace.credits.filter((credit) => !credit.responsible_role || credit.responsible_role === workspace.userRole)
    : workspace.credits;
  const stats = creditStats(roleScopedCredits);
  const selectedCredit =
    roleScopedCredits.find((credit) => credit.id === resolvedSearchParams?.credit) ?? roleScopedCredits[0];

  if (!selectedCredit) {
    return (
      <Shell
        title={
          <span className="flex items-center gap-3">
            {workspace.project.name}
            {["project_admin", "super_admin", "super_user", "L3", "L5"].includes(workspace.userRole) && (
              <Badge
                className={`text-[10px] px-1.5 py-0 h-5 ${
                  workspace.project.health_status === "HEALTHY"
                    ? "border border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[var(--color-green)]"
                    : workspace.project.health_status === "AT_RISK"
                      ? "border border-[var(--color-red-light)] bg-[var(--color-red-light)] text-[var(--color-red)]"
                      : "border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]"
                }`}
              >
                {workspace.project.health_status}
              </Badge>
            )}
          </span>
        }
        aiTitle={workspace.project.name}
        description={`${workspace.project.certification_type} / ${workspace.project.client || "Client TBD"}`}
        role={workspace.userRole}
        notificationCount={workspace.notifications.filter((item) => !item.read_at).length}
      >
        <section className="surface-card px-5 py-8">
          <p className="text-[15px] font-medium text-[var(--color-text-primary)]">Project Workspace Ready</p>
          <p className="mt-2 max-w-[720px] text-[13px] leading-6 text-[var(--color-text-secondary)]">
            This project has been created successfully, but credits are not instantiated yet.
            Upload the IGBC project guidebook and import the tracker baseline to instantiate the workspace.
          </p>
          {canManageGuidebook ? (
            <div className="mt-5 grid gap-2 md:max-w-[760px] md:grid-cols-[minmax(0,1fr)_auto]">
              <form action={uploadProjectGuidebookAction} encType="multipart/form-data" className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                <input type="hidden" name="project_id" value={projectId} />
                <input
                  name="guidebook"
                  type="file"
                  accept=".pdf,application/pdf"
                  required
                  className="h-[36px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[12px] text-[var(--color-text-primary)]"
                />
                <button type="submit" className="h-[36px] rounded-md bg-[var(--color-green)] px-3 text-[12px] font-medium text-white">
                  Upload Guidebook
                </button>
              </form>
              <form action={importProjectTrackerBaselineAction} encType="multipart/form-data" className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                <input type="hidden" name="project_id" value={projectId} />
                <input
                  name="tracker_file"
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  required
                  className="h-[36px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[12px] text-[var(--color-text-primary)]"
                />
                <button type="submit" className="h-[36px] rounded-md bg-[var(--color-blue)] px-3 text-[12px] font-medium text-white">
                  Import Tracker Baseline
                </button>
              </form>
            </div>
          ) : (
            <p className="mt-4 text-[12px] text-[var(--color-text-secondary)]">
              Ask Project Admin or Super User to complete project instantiation.
            </p>
          )}
          <div className="mt-6">
            <Link href="/projects">
              <Button variant="secondary">Back to Projects</Button>
            </Link>
          </div>
        </section>
      </Shell>
    );
  }

  const filteredCredits = roleScopedCredits.filter((credit) => {
    const categoryOk = resolvedSearchParams?.category ? credit.category === resolvedSearchParams.category : true;
    const statusOk = resolvedSearchParams?.status ? toLegacyCreditStatus(credit.state ?? credit.status) === resolvedSearchParams.status : true;
    return categoryOk && statusOk;
  });
  const mandatoryCredits = roleScopedCredits.filter((credit) => credit.is_mandatory);
  const mandatoryComplete = mandatoryCredits.filter((credit) => toLegacyCreditStatus(credit.state ?? credit.status) === "complete").length;
  const reviewableDocuments = (selectedCredit.documents || []).filter((document: any) =>
    canOwnerReview ? document.status === "uploaded" : canFinalReview ? document.status === "owner_approved" : false,
  );
  const selectedReviewDocument = reviewableDocuments[0] ?? selectedCredit.documents?.[0] ?? null;
  const aiFacts = [
    `Selected credit: ${mandatoryCode(selectedCredit.credit_code, selectedCredit.is_mandatory)} ${selectedCredit.credit_name}.`,
    `Required document types: ${
      selectedCredit.documents_required.filter((doc) => doc.required).map((doc) => doc.label).join(", ") || "none"
    }.`,
    `Uploaded files on this credit: ${
      selectedCredit.documents.map((document) => `${document.file_name} (${document.status})`).join(", ") || "none"
    }.`,
    `Current user role: ${workspace.userRole}.`,
    `What to submit guidance: ${selectedCredit.what_to_submit || selectedCredit.documentation_summary || "Not set"}.`,
    `Effort profile: ${selectedCredit.effort_level ?? "moderate"}; guidance: ${selectedCredit.effort_guidance ?? "Not set"}.`,
    workspace.guidebooks?.[0]
      ? `Project guidebook in force: ${workspace.guidebooks[0].file_name} (uploaded ${formatDateTimeIST(workspace.guidebooks[0].created_at)}).`
      : "No project guidebook uploaded yet.",
    canFinalReview
      ? "Project Admin final approval is required before a document can be included in the submission pack."
      : canOwnerReview
        ? "Project Owner reviews first and forwards valid files to Project Admin."
        : "This user can inspect the validation context but is not the final approver.",
  ];
  if (selectedReviewDocument?.notes) {
    aiFacts.push(`Current document notes: ${selectedReviewDocument.notes}`);
  }
  if (selectedCredit.remarks[0]?.body) {
    aiFacts.push(`Latest remark: ${selectedCredit.remarks[0].body}`);
  }
  const aiNextSteps = [
    selectedReviewDocument
      ? `Validate whether ${selectedReviewDocument.file_name} matches the required checklist for ${selectedCredit.credit_name}.`
      : `Request the first required file for ${selectedCredit.credit_name}.`,
    selectedCredit.documents_required
      .filter((doc) => doc.required && !selectedCredit.documents.some((file) => file.doc_category === doc.type))
      .map((doc) => `Missing required file type: ${doc.label}.`)[0] ?? "All required document types have at least one uploaded file.",
    canFinalReview
      ? "If the evidence is complete and relevant, include it in the submission pack. Otherwise add a precise rejection note."
      : "If the evidence is relevant, forward it to Project Admin. Otherwise reject it with a precise reason.",
  ];
  const validationAssistantContext: AssistantContext = {
    surface: "project",
    title: workspace.project.name,
    summary: `Validation assistant for ${selectedCredit.credit_name} under ${workspace.project.certification_type}.`,
    currentItem: selectedReviewDocument
      ? `${selectedReviewDocument.file_name} (${selectedReviewDocument.status})`
      : `${selectedCredit.credit_name} review`,
    facts: aiFacts,
    nextSteps: aiNextSteps,
  };
  const categoryProgress = stats.categories.map((item) => {
    const categoryCredits = roleScopedCredits.filter((credit) => credit.category === item.key);
    const completed = categoryCredits.filter((credit) => toLegacyCreditStatus(credit.state ?? credit.status) === "complete").length;
    const inProgress = categoryCredits.filter((credit) => toLegacyCreditStatus(credit.state ?? credit.status) === "in_progress").length;
    const blocked = categoryCredits.filter((credit) => toLegacyCreditStatus(credit.state ?? credit.status) === "blocked").length;
    const avgCompletion = categoryCredits.length
      ? Math.round(
          categoryCredits.reduce((sum, credit) => sum + Number(credit.completion_pct ?? 0), 0) /
            categoryCredits.length,
        )
      : 0;
    return {
      ...item,
      completed,
      inProgress,
      blocked,
      avgCompletion,
    };
  });
  const selectedCreditValidationRules = (workspace.validationRules ?? []).filter(
    (rule: any) => (rule.project_credit_id && rule.project_credit_id === selectedCredit.id) || rule.credit_id === selectedCredit.id,
  );

  const milestones = await stageGateService.getMilestones(projectId);


  const activeWorkTab = resolvedSearchParams?.tab || "overview";

  const getTabUrl = (tabName: string) => {
    return `/projects/${projectId}${queryString({
      category: resolvedSearchParams?.category,
      status: resolvedSearchParams?.status,
      credit: selectedCredit.id,
      tab: tabName
    })}`;
  };

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "credits", label: "Credits" },
    { key: "documents", label: "Documents" },
    { key: "clarifications", label: "Clarifications" },
    { key: "exports", label: "Exports" }
  ];

  return (
    <Shell
      title={
        <span className="flex items-center gap-3">
          {workspace.project.name}
          {["project_admin", "super_admin", "super_user", "L3", "L5"].includes(workspace.userRole) && (
            <Badge
              className={`text-[10px] px-1.5 py-0 h-5 ${
                workspace.project.health_status === "HEALTHY"
                  ? "border border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[var(--color-green)]"
                  : workspace.project.health_status === "AT_RISK"
                    ? "border border-[var(--color-red-light)] bg-[var(--color-red-light)] text-[var(--color-red)]"
                    : "border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]"
              }`}
            >
              {workspace.project.health_status}
            </Badge>
          )}
        </span>
      }
      aiTitle={workspace.project.name}
      description={`${workspace.project.certification_type} / Target ${workspace.project.target_rating}`}
      role={workspace.userRole}
      notificationCount={workspace.notifications.filter((item) => !item.read_at).length}
    >
      {resolvedSearchParams?.error ? (
        <div className="mb-4 rounded-md border border-[var(--color-red-light)] bg-[var(--color-red-soft)] p-3 text-[12px] text-[var(--color-red)]">
          {resolvedSearchParams.error}
        </div>
      ) : null}
      {resolvedSearchParams?.success ? (
        <div className="mb-4 rounded-md border border-[var(--color-green-light)] bg-[var(--color-green-soft)] p-3 text-[12px] text-[var(--color-green)]">
          {resolvedSearchParams.success}
        </div>
      ) : null}

      {/* 5-TAB WORKSPACE NAVIGATION */}
      <div className="flex border-b border-[var(--color-border)] mb-6 overflow-x-auto whitespace-nowrap gap-1">
        {tabs.map((t) => {
          const active = activeWorkTab === t.key;
          return (
            <Link
              key={t.key}
              href={getTabUrl(t.key)}
              className={`px-4 py-2.5 text-[12px] font-bold transition-all relative ${
                active
                  ? "text-[var(--color-green)] border-b-2 border-[var(--color-green)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeWorkTab === "overview" && (
        <div className="space-y-6 text-left">
          {/* Milestones Stage Gate Tracker */}
          <StageGateTracker milestones={milestones} />

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-6">
              {/* Category Progress Overview */}
              <div className="surface-card p-4 space-y-4">
                <h3 className="text-[12px] font-black uppercase tracking-wider text-[var(--color-text-primary)]">
                  Category Completion
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {categoryProgress.map((item) => (
                    <Link
                      key={item.key}
                      href={`/projects/${projectId}?category=${item.key}&tab=credits`}
                      className="border border-[var(--color-border)] rounded-lg p-3.5 hover:border-[var(--color-border-strong)] transition-all bg-[var(--color-surface-2)]"
                    >
                      <div className="flex justify-between items-center text-[12px] font-bold text-[var(--color-text-primary)] mb-1.5">
                        <span>{item.label}</span>
                        <span>{item.avgCompletion}%</span>
                      </div>
                      <Progress value={item.avgCompletion} />
                      <div className="mt-2.5 flex justify-between text-[10px] font-semibold text-[var(--color-text-tertiary)]">
                        <span>{item.completed} / {item.count} Complete</span>
                        <span>{item.blocked} Blocked</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Project Status Panel */}
              <div className="surface-card p-4 space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Project Parameters
                </h3>
                <div className="text-[12px] font-bold text-[var(--color-text-primary)] space-y-1">
                  <p>Type: {workspace.project.certification_type}</p>
                  <p>Target Rating: {workspace.project.target_rating}</p>
                  <p>Location: {workspace.project.location || "TBD"}</p>
                </div>
              </div>

              {/* Recent Activity Log */}
              <div className="surface-card p-4 space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Activity Feed
                </h3>
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {(workspace.activityLogs ?? []).length > 0 ? (
                    (workspace.activityLogs ?? []).slice(0, 6).map((log) => (
                      <div key={log.id} className="text-[11px] border-b border-[var(--color-border)] pb-2 last:border-0 last:pb-0">
                        <p className="font-semibold text-[var(--color-text-primary)] leading-snug">{log.summary}</p>
                        <p className="text-[9px] text-[var(--color-text-tertiary)] mt-0.5">
                          {formatDateTimeIST(log.created_at)} · {log.actor_role}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-[var(--color-text-tertiary)]">No activity logged.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CREDITS (Compact matrix table) */}
      {activeWorkTab === "credits" && (
        <div className="space-y-4 text-left">
          {/* Header & filters bar */}
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2">
              <Link
                href={`/projects/${projectId}?tab=credits`}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg border ${
                  !resolvedSearchParams?.category
                    ? "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-primary)]"
                    : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
                }`}
              >
                All Credits
              </Link>
              {stats.categories.map((c) => (
                <Link
                  key={c.key}
                  href={`/projects/${projectId}?category=${c.key}&tab=credits`}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg border ${
                    resolvedSearchParams?.category === c.key
                      ? "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-primary)]"
                      : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
                  }`}
                >
                  {c.key}
                </Link>
              ))}
            </div>
            <Badge className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-bold text-[10px]">
              {filteredCredits.length} Credits Filtered
            </Badge>
          </div>

          {/* Compact matrix table */}
          <div className="surface-card overflow-hidden">
            <table className="w-full border-collapse text-[12px] text-left">
              <thead className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase text-[var(--color-text-tertiary)]">Code</th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase text-[var(--color-text-tertiary)]">Title</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold uppercase text-[var(--color-text-tertiary)]">Points</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[var(--color-text-tertiary)]">Status</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[var(--color-text-tertiary)]">Reviewer / Rep.</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[var(--color-text-tertiary)]">Blockers / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredCredits.map((credit) => {
                  const selected = credit.id === selectedCredit.id;
                  const creditStatus = toLegacyCreditStatus(credit.state ?? credit.status);
                  const isBlocked = creditStatus === "blocked";
                  return (
                    <tr
                      key={credit.id}
                      className={`hover:bg-[var(--color-surface-2)] transition-colors ${
                        selected ? "bg-[var(--color-green-light)]" : ""
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/projects/${projectId}?credit=${credit.id}&tab=documents`}
                          className="font-mono font-black text-[var(--color-green)] hover:underline"
                        >
                          {mandatoryCode(credit.credit_code, credit.is_mandatory)}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/projects/${projectId}?credit=${credit.id}&tab=documents`}
                          className="font-bold text-[var(--color-text-primary)] hover:underline"
                        >
                          {credit.credit_name}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[var(--color-text-secondary)]">
                        {Number(credit.available_points ?? 0).toFixed(1)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge className={creditStatuses[creditStatus]}>
                          {creditStatus.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-[var(--color-text-secondary)] font-medium">
                        {credit.responsible_role ? String(credit.responsible_role).replace("_", " ") : "Unassigned"}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--color-text-tertiary)] font-medium truncate max-w-[280px]">
                        {isBlocked ? (
                          <span className="text-[var(--color-red)] font-bold flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {credit.remarks[0]?.body || "Blocked by validation checkpoint"}
                          </span>
                        ) : (
                          credit.remarks[0]?.body || ""
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: DOCUMENTS */}
      {activeWorkTab === "documents" && (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6 text-left items-start">
          {/* Left panel: Checklist & files list */}
          <div className="space-y-4">
            <div className="surface-card p-4 space-y-3.5">
              <div className="border-b border-[var(--color-border)] pb-2">
                <span className="text-[9px] uppercase font-black text-slate-500">Active Credit</span>
                <h4 className="text-[12px] font-bold text-[var(--color-text-primary)] truncate">
                  {selectedCredit.credit_code}: {selectedCredit.credit_name}
                </h4>
              </div>

              {/* Guideline */}
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-black text-slate-500">Expectations</span>
                <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)] bg-[var(--color-surface-2)] p-2.5 rounded border border-[var(--color-border)]">
                  {selectedCredit.what_to_submit || "No instructions provided."}
                </p>
              </div>

              {/* Checklist */}
              <div className="space-y-2">
                <span className="text-[9px] uppercase font-black text-slate-500">Requirements</span>
                <div className="space-y-2">
                  {selectedCredit.documents_required.map((doc) => {
                    const matching = selectedCredit.documents.filter(f => f.doc_category === doc.type);
                    const isApproved = matching.some(f => f.status === "approved");
                    return (
                      <div key={doc.type} className="flex justify-between items-center text-[11px] bg-[var(--color-surface-2)] p-2 rounded border border-[var(--color-border)]">
                        <div>
                          <p className="font-bold text-[var(--color-text-primary)]">{doc.label}</p>
                          <p className="text-[10px] text-[var(--color-text-tertiary)]">{doc.required ? "Required" : "Optional"}</p>
                        </div>
                        {isApproved ? (
                          <CheckCircle2 className="h-4 w-4 text-[var(--color-green)] shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-[var(--color-border-strong)] shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* List of uploaded files */}
            <div className="surface-card p-4 space-y-3">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-[var(--color-text-primary)]">
                Uploaded Evidence Files ({selectedCredit.documents.length})
              </h4>
              <div className="space-y-2">
                {selectedCredit.documents.length > 0 ? (
                  selectedCredit.documents.map((doc) => (
                    <div key={doc.id} className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-3 text-[11px] space-y-2">
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-bold text-[var(--color-text-primary)] truncate max-w-[70%]">{doc.file_name}</span>
                        <Badge className="text-[9px] font-black uppercase shrink-0">{doc.status}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={`/api/documents/${doc.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-[var(--color-green)] font-bold hover:underline"
                        >
                          Download PDF
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 border border-dashed border-[var(--color-border)] text-center rounded-lg text-slate-400">
                    <p className="text-[11px] font-medium">No files uploaded yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right panel: Upload forms & AI advisory */}
          <div className="space-y-4">
            {/* Upload form */}
            {canUpload && (
              <UploadDocumentForm
                projectId={projectId}
                creditId={selectedCredit.id}
                projectCreditId={selectedCredit.id}
                docTypes={selectedCredit.documents_required.map(doc => doc.type)}
                disabled={!env.isConfigured || !selectedCredit.documents_required.length}
              />
            )}

            {/* AI Advisor Panel */}
            {canReview && (
              <AiGuidePanel
                context={validationAssistantContext}
                enabled={env.aiReady}
                storageKey={`tracknov-ai-validation-${projectId}-${selectedCredit.id}`}
                title="AI Validation Assistant"
                description="Checks document checklist compatibility and keywords before final gate submission."
                prompts={[
                  "Validate this uploaded document against the credit checklist.",
                  "What is missing before this can go into the submission pack?",
                ]}
              />
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: CLARIFICATIONS */}
      {activeWorkTab === "clarifications" && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 text-left items-start">
          {/* Remarks Log */}
          <div className="surface-card p-4 space-y-4">
            <div className="border-b border-[var(--color-border)] pb-2.5">
              <h3 className="text-[13px] font-bold text-[var(--color-text-primary)] uppercase tracking-wide">
                Remarks & Clarification Ledger
              </h3>
              <p className="text-[11px] text-[var(--color-text-tertiary)]">
                Discussion and official response history for credit {selectedCredit.credit_code}.
              </p>
            </div>

            <div className="space-y-3">
              {selectedCredit.remarks.length > 0 ? (
                selectedCredit.remarks.map((remark) => (
                  <div key={remark.id} className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center text-[9px] text-[var(--color-text-tertiary)] font-black uppercase">
                      <span>{remark.role}</span>
                      <span>{formatDateTimeIST(remark.created_at)}</span>
                    </div>
                    <p className="text-[12px] text-[var(--color-text-secondary)] font-medium leading-relaxed">
                      {remark.body}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-6 border border-dashed border-[var(--color-border)] text-center text-slate-400 rounded-lg">
                  <p className="text-[11px] font-medium">No remarks or clarifications on this credit.</p>
                </div>
              )}
            </div>

            {/* Post Remark */}
            {canReview && (
              <form action={addRemarkAction} className="space-y-2 pt-3 border-t border-[var(--color-border)]">
                <input type="hidden" name="project_id" value={projectId} />
                <input type="hidden" name="credit_id" value={selectedCredit.id} />
                <input type="hidden" name="role" value={workspace.userRole} />
                <Textarea name="body" placeholder="Post a comment or send-back remark..." required className="min-h-[80px]" />
                <Button type="submit" className="w-full text-[11px] bg-[var(--color-green)] text-white hover:bg-[var(--color-green-dim)] h-8 rounded-lg">
                  Post Remark
                </Button>
              </form>
            )}
          </div>

          {/* Assignments & Gate Status */}
          <div className="space-y-4">
            {/* Task Assignor */}
            {canAssignTasks(workspace.userRole) && (
              <div className="surface-card p-4 space-y-3.5">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-[var(--color-text-primary)]">
                  Assign Responsibility
                </h3>
                <form action={createTaskAction} className="space-y-3">
                  <input type="hidden" name="project_id" value={projectId} />
                  <input type="hidden" name="credit_id" value={selectedCredit.id} />
                  <input type="hidden" name="task_type" value="credit_documentation" />
                  
                  <select name="assigned_to" required className="w-full border border-[var(--color-border)] p-2 text-[11px] bg-[var(--color-surface)] rounded-lg">
                    <option value="">Select Assignee</option>
                    {workspace.members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.member_email || m.full_name} ({m.role})
                      </option>
                    ))}
                  </select>

                  <select name="priority" className="w-full border border-[var(--color-border)] p-2 text-[11px] bg-[var(--color-surface)] rounded-lg">
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="CRITICAL">Critical</option>
                  </select>

                  <Button type="submit" className="w-full text-[11px] h-8 rounded-lg bg-[var(--color-green)] text-white hover:bg-[var(--color-green-dim)]">
                    Create Task
                  </Button>
                </form>
              </div>
            )}

            {/* State Decisions */}
            {canReview && (
              <div className="surface-card p-4 space-y-3">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-[var(--color-text-primary)]">
                  Gate Approval State
                </h3>
                <form action={setCreditStateAction}>
                  <input type="hidden" name="project_id" value={projectId} />
                  <input type="hidden" name="credit_id" value={selectedCredit.id} />
                  <input type="hidden" name="action" value="complete" />
                  <Button type="submit" className="w-full text-[11px] bg-[var(--color-green)] text-white hover:bg-[var(--color-green-dim)] h-8 rounded-lg">
                    Mark Credit Complete
                  </Button>
                </form>

                <form action={setCreditStateAction} className="space-y-2 mt-2">
                  <input type="hidden" name="project_id" value={projectId} />
                  <input type="hidden" name="credit_id" value={selectedCredit.id} />
                  <input type="hidden" name="action" value="blocked" />
                  <select name="blocked_by" className="w-full border border-[var(--color-border)] p-2 text-[11px] bg-[var(--color-surface)] rounded-lg">
                    <option value="owner">Blocked by owner</option>
                    <option value="consultant">Blocked by consultant</option>
                  </select>
                  <Button type="submit" variant="danger" className="w-full text-[11px] h-8 rounded-lg text-white">
                    Set Blocked Status
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: EXPORTS */}
      {activeWorkTab === "exports" && (
        <div className="space-y-6 text-left">
          {/* Guidebook uploads & reference */}
          <div className="surface-card p-4 space-y-4">
            <h3 className="text-[13px] font-black uppercase tracking-wider text-[var(--color-text-primary)]">
              Reference Guidebooks
            </h3>
            {canManageGuidebook && (
              <form action={uploadProjectGuidebookAction} encType="multipart/form-data" className="flex gap-2 items-center flex-wrap bg-[var(--color-surface-2)] p-3 rounded-lg border border-[var(--color-border)]">
                <input type="hidden" name="project_id" value={projectId} />
                <input name="guidebook" type="file" accept=".pdf,application/pdf" required className="text-[11px]" />
                <Button type="submit" className="h-8 text-[11px] rounded-lg">
                  Upload Reference
                </Button>
              </form>
            )}

            <div className="space-y-2">
              {workspace.guidebooks?.length ? (
                workspace.guidebooks.map((guide) => (
                  <div key={guide.id} className="flex justify-between items-center p-3 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-2)] text-[11px]">
                    <div>
                      <p className="font-bold text-[var(--color-text-primary)]">{guide.file_name}</p>
                      <p className="text-[9px] text-[var(--color-text-tertiary)]">{formatDateTimeIST(guide.created_at)}</p>
                    </div>
                    {guide.signed_url && (
                      <a href={guide.signed_url} target="_blank" rel="noreferrer" className="text-[var(--color-green)] font-bold hover:underline">
                        Download PDF
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-[var(--color-text-tertiary)]">No guidebook files uploaded.</p>
              )}
            </div>
          </div>

          {/* XLSX / PDF exports */}
          <div className="surface-card p-4 space-y-4">
            <h3 className="text-[13px] font-black uppercase tracking-wider text-[var(--color-text-primary)]">
              Submission Packs & Reports
            </h3>
            <p className="text-[12px] text-[var(--color-text-secondary)] max-w-[640px] leading-relaxed">
              Export the current IGBC credit readiness tracker checklist or generate a comprehensive certification preflight PDF report.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Button variant="secondary" asChild className="h-8 text-[11px] px-3.5 rounded-lg">
                <Link href={`/api/projects/${projectId}/tracker`}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Export XLSX Tracker
                </Link>
              </Button>
              <Button variant="secondary" asChild className="h-8 text-[11px] px-3.5 rounded-lg">
                <Link href={`/api/projects/${projectId}/summary`}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> PDF Executive Summary
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

