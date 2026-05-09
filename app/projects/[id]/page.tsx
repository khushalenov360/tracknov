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
import { creditStats, getProjectWorkspace } from "@/lib/data";
import { env } from "@/lib/env";
import { canManageProjectGuidebook, canReviewProjectDocuments, canUploadProjectDocuments, canAssignTasks } from "@/lib/rbac";
import {
  formatDateIST,
  formatDateTimeIST,
  pct,
  cleanRoleLabel,
} from "@/lib/utils";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: { id: string };
  searchParams?: {
    category?: string;
    status?: string;
    credit?: string;
    error?: string;
    success?: string;
  };
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
  { label: "Certificates/ Declaration", aliases: ["Certificate/Declaration", "Certificates/ Declaration"] },
  { label: "Drawings", aliases: ["Drawing", "Drawings"] },
  { label: "Calculations & Tables", aliases: ["Calculation & Tables", "Calculations & Tables"] },
  { label: "Invoices", aliases: ["Invoice", "Invoices"] },
  { label: "Pic/Video", aliases: ["Pic/Video"] },
] as const;

const defaultCategoryMeta = {
  dot: "bg-[var(--color-text-tertiary)]",
  color: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
};

function resolveTrackerCellStatus(credit: any, aliases: readonly string[]) {
  const requiredSlots = (credit.documents_required ?? []).filter((doc: any) => aliases.includes(doc.type) || aliases.includes(doc.label));
  if (!requiredSlots.length || requiredSlots.every((doc: any) => !doc.required)) {
    return "NA";
  }

  const linkedDocs = (credit.documents ?? []).filter((doc: any) =>
    requiredSlots.some((slot: any) => slot.type === doc.doc_category || slot.label === doc.doc_category),
  );

  if (!linkedDocs.length) return "Required";

  const states = linkedDocs.map((doc: any) => String(doc.state ?? doc.status ?? "").toUpperCase());
  if (states.some((state: string) => state === "REJECTED" || state === "CLARIFICATION")) return "Clarification";
  if (states.some((state: string) => state === "SUBMITTED" || state === "UNDER_REVIEW" || state === "READY" || state === "UPLOADED")) return "Under Review";
  return "Received";
}

function toLegacyCreditStatus(rawState: string | undefined): keyof typeof creditStatuses {
  if (!rawState) return "pending";
  const normalized = rawState.toLowerCase();
  if (normalized === "complete" || normalized === "approved" || normalized === "closed") return "complete";
  if (normalized === "blocked" || normalized === "rejected") return "blocked";
  if (normalized === "in_progress" || normalized === "under_review" || normalized === "submitted" || normalized === "resubmitted") {
    return "in_progress";
  }
  if (normalized === "draft" || normalized === "assigned" || normalized === "not_started" || normalized === "pending" || normalized === "clarification" || normalized === "ready") {
    return "pending";
  }
  if (normalized in creditStatuses) return normalized as keyof typeof creditStatuses;
  return "pending";
}

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
  console.log(">>> LOADING DASHBOARD FOR PROJECT:", params.id);
  const user = await getCurrentUser();
  let workspaceError: string | null = null;
  let workspace = null as Awaited<ReturnType<typeof getProjectWorkspace>>;
  try {
    workspace = await getProjectWorkspace(params.id);
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
  const canOwnerReview = ["owner", "super_user"].includes(workspace.userRole);
  const canFinalReview = ["project_admin", "super_admin", "super_user"].includes(workspace.userRole);
  const canConfigureDocRequirements = ["project_admin", "super_user"].includes(workspace.userRole);
  const canAssignContributors = ["owner", "project_admin", "super_admin", "super_user"].includes(workspace.userRole);
  const contributorMembers = workspace.members;
  const roleScopedCredits = isL0Contributor
    ? workspace.credits.filter((credit) => !credit.responsible_role || credit.responsible_role === workspace.userRole)
    : workspace.credits;
  const stats = creditStats(roleScopedCredits);
  const selectedCredit =
    roleScopedCredits.find((credit) => credit.id === searchParams?.credit) ?? roleScopedCredits[0];

  if (!selectedCredit) {
    return (
      <Shell
        title={workspace.project.name}
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
                <input type="hidden" name="project_id" value={params.id} />
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
                <input type="hidden" name="project_id" value={params.id} />
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
    const categoryOk = searchParams?.category ? credit.category === searchParams.category : true;
    const statusOk = searchParams?.status ? toLegacyCreditStatus(credit.state ?? credit.status) === searchParams.status : true;
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


  return (
    <Shell
      title={workspace.project.name}
      description={`${workspace.project.certification_type} / Target ${workspace.project.target_rating}`}
      role={workspace.userRole}
      notificationCount={workspace.notifications.filter((item) => !item.read_at).length}
    >
      {searchParams?.error ? (
        <div className="mb-4 rounded-md border border-[var(--color-red-light)] bg-[var(--color-red-soft)] p-3 text-[12px] text-[var(--color-red)]">
          {searchParams.error}
        </div>
      ) : null}
      {searchParams?.success ? (
        <div className="mb-4 rounded-md border border-[var(--color-green-light)] bg-[var(--color-green-soft)] p-3 text-[12px] text-[var(--color-green)]">
          {searchParams.success}
        </div>
      ) : null}

      {canManageGuidebook ? (
      <section className="mb-4 surface-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-[var(--color-text-primary)]">Project Guidebook (IGBC Reference)</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
              This is the governing reference for credit expectations, evidence quality, and review decisions.
            </p>
          </div>
          {canManageGuidebook ? (
            <div className="flex flex-col gap-2">
              <form action={uploadProjectGuidebookAction} encType="multipart/form-data" className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="project_id" value={params.id} />
                <input
                  name="title"
                  placeholder="Guidebook title (optional)"
                  className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none"
                />
                <input
                  name="guidebook"
                  type="file"
                  accept=".pdf,application/pdf"
                  required
                  className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[12px] text-[var(--color-text-primary)]"
                />
                <button type="submit" className="h-[34px] rounded-md bg-[var(--color-green)] px-3 text-[12px] font-medium text-white">
                  Upload Guidebook
                </button>
              </form>
              <form action={importProjectTrackerBaselineAction} encType="multipart/form-data" className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="project_id" value={params.id} />
                <input
                  name="tracker_file"
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  required
                  className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[12px] text-[var(--color-text-primary)]"
                />
                <button type="submit" className="h-[34px] rounded-md bg-[var(--color-blue)] px-3 text-[12px] font-medium text-white">
                  Import Tracker Baseline
                </button>
              </form>
            </div>
          ) : null}
        </div>
        {workspace.guidebooks?.length ? (
          <div className="mt-3 flex flex-col gap-2">
            {workspace.guidebooks.slice(0, 3).map((guide) => (
              <div key={guide.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-[12px]">
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">{guide.title}</p>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">{guide.file_name} · {formatDateTimeIST(guide.created_at)}</p>
                </div>
                {guide.signed_url ? (
                  <a href={guide.signed_url} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-[var(--color-blue)]">
                    Open guidebook
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[12px] text-[var(--color-text-secondary)]">No guidebook uploaded yet for this project.</p>
        )}
      </section>
      ) : null}

      <details id="pending-list" className="mb-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4" open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-medium text-[var(--color-text-primary)]">
          <span>Category progress</span>
          <span className="text-[11px] font-normal text-[var(--color-text-tertiary)]">Collapse / expand</span>
        </summary>
        <section className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {categoryProgress.map((item) => {
            const meta = categoryMeta[item.key as keyof typeof categoryMeta] ?? defaultCategoryMeta;
            return (
              <Link
                key={item.key}
                href={`/projects/${params.id}${queryString({
                  category: item.key,
                  status: searchParams?.status,
                  credit: searchParams?.credit,
                })}`}
                className="surface-card block p-4 hover:border-[var(--color-border-strong)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[12px] font-medium text-[var(--color-text-primary)]">
                      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                      {item.label}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                      {item.completed}/{item.count} complete
                    </p>
                  </div>
                  <span className="mono text-[12px] text-[var(--color-text-secondary)]">{item.avgCompletion}%</span>
                </div>
                <div className="mt-3">
                  <Progress value={item.avgCompletion} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[var(--color-text-tertiary)]">
                  <span>{item.inProgress} in progress</span>
                  <span>{item.blocked} blocked</span>
                </div>
              </Link>
            );
          })}
        </section>
      </details>

      <div className="grid gap-4 xl:grid-cols-[200px_minmax(0,1fr)_280px]">
        <aside className="rounded-xl border-r border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-4">
          <div className="border-b border-[var(--color-border)] px-2 pb-3">
            <p className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
              {workspace.project.name}
            </p>
            <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">{workspace.project.target_rating}</p>
          </div>

          <div className="mt-3">
            <p className="dense-label px-2">Categories</p>
            <nav className="mt-2 space-y-1">
              <Link
                href={`/projects/${params.id}${queryString({
                  status: searchParams?.status,
                  credit: searchParams?.credit,
                })}`}
                className={`flex items-center justify-between rounded-md px-[14px] py-[7px] text-[12px] ${
                  !searchParams?.category
                    ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] ring-1 ring-inset ring-[var(--color-border)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="h-[7px] w-[7px] rounded-full bg-[var(--color-text-tertiary)]" />
                  All credits
                </span>
                <span className="mono rounded-md bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px]">
                  {roleScopedCredits.length}
                </span>
              </Link>
              {stats.categories.map((item) => {
                const meta = categoryMeta[item.key as keyof typeof categoryMeta] ?? defaultCategoryMeta;
                const active = searchParams?.category === item.key;
                return (
                  <Link
                    key={item.key}
                    href={`/projects/${params.id}${queryString({
                      category: item.key,
                      status: searchParams?.status,
                      credit: searchParams?.credit,
                    })}`}
                    className={`flex items-center justify-between rounded-md border-r-2 px-[14px] py-[7px] text-[12px] ${
                      active
                        ? "border-[var(--color-green)] bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                        : "border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`h-[7px] w-[7px] rounded-full ${meta.dot}`} />
                      {item.key}
                    </span>
                    <span className="mono rounded-md bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px]">
                      {roleScopedCredits.filter((credit) => credit.category === item.key).length}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-4">
            <p className="dense-label px-2">Status</p>
            <div className="mt-2 space-y-1">
              {Object.entries(creditStatuses).map(([status, classes]) => {
                const active = searchParams?.status === status;
                return (
                  <Link
                    key={status}
                    href={`/projects/${params.id}${queryString({
                      category: searchParams?.category,
                      status,
                      credit: searchParams?.credit,
                    })}`}
                    className={`flex items-center justify-between rounded-md px-[14px] py-[7px] text-[12px] ${
                      active
                        ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] ring-1 ring-inset ring-[var(--color-border)]"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
                    }`}
                  >
                    <span>{status.replace("_", " ")}</span>
                    <Badge className={classes}>{roleScopedCredits.filter((credit) => toLegacyCreditStatus(credit.state ?? credit.status) === status).length}</Badge>
                  </Link>
                );
              })}
            </div>
          </div>

          {isL0Contributor ? (
            <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <p className="text-[11px] font-medium text-[var(--color-text-primary)]">My tasks</p>
              <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                {roleScopedCredits.filter((credit) => toLegacyCreditStatus(credit.state ?? credit.status) === "complete").length} of {roleScopedCredits.length} credits complete
              </p>
            </div>
          ) : null}

          <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--color-red)]">
              <AlertTriangle className="h-3.5 w-3.5" />
              Mandatory requirements
            </div>
            <p className="mono mt-2 text-[12px] text-[var(--color-text-primary)]">
              {mandatoryComplete}/{mandatoryCredits.length} complete
            </p>
          </div>
        </aside>

        <section id="credit-grid" className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[13px] font-medium text-[var(--color-text-primary)]">Credit tracker</h2>
              <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">
                Dense review grid for approvals, remarks, and owner uploads.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" asChild className="rounded-md px-3">
                <Link href={`/api/projects/${params.id}/tracker`}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Export XLSX
                </Link>
              </Button>
              <Button variant="secondary" asChild className="rounded-md px-3">
                <Link href={`/api/projects/${params.id}/summary`}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  PDF summary
                </Link>
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-[12px]">
              <thead className="sticky top-0 z-10 bg-[var(--color-surface-2)]">
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                    Criteria
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                    Credit name
                  </th>
                  {trackerColumns.map((column) => (
                    <th key={column.label} className="px-2 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                      {column.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                    % complete
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                    Documents received
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                    Remark
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                    Responsible
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                    Available points
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                    Achievable points
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCredits.map((credit) => {
                  const selected = credit.id === selectedCredit.id;
                  const creditStatus = toLegacyCreditStatus(credit.state ?? credit.status);
                  const category = categoryMeta[credit.category as keyof typeof categoryMeta] ?? defaultCategoryMeta;
                  const displayCode = mandatoryCode(credit.credit_code, credit.is_mandatory);
                  const preview = credit.remarks[0]?.body ?? credit.documentation_summary ?? "No remarks yet";
                  return (
                    <tr
                      key={credit.id}
                      className={`h-10 border-b border-[var(--color-border)] transition-colors duration-100 ${
                        selected
                          ? "bg-[var(--color-green-light)]"
                          : "hover:bg-[var(--color-surface-2)]"
                      }`}
                    >
                      <td className="px-3 py-2 align-middle">
                        <Link
                          href={`/projects/${params.id}${queryString({
                            category: searchParams?.category,
                            status: searchParams?.status,
                            credit: credit.id,
                          })}`}
                          className={`mono inline-flex min-w-[68px] items-center justify-center rounded-md border px-2 py-1 text-[10px] ${
                            credit.is_mandatory ? "border-[var(--color-red-light)] bg-[var(--color-red-light)] text-[var(--color-red)]" : category.color
                          }`}
                        >
                          {displayCode}
                        </Link>
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-2 align-middle text-[13px] text-[var(--color-text-primary)]">
                        <Link
                          href={`/projects/${params.id}${queryString({
                            category: searchParams?.category,
                            status: searchParams?.status,
                            credit: credit.id,
                          })}`}
                          className="hover:text-[var(--color-green)]"
                        >
                          {credit.credit_name}
                        </Link>
                      </td>                      {trackerColumns.map((column) => {
                        const cell = resolveTrackerCellStatus(credit, column.aliases);
                        const columnAliases = column.aliases as readonly string[];
                        const requirementSlot = (credit.documents_required ?? []).find((doc: any) =>
                          columnAliases.includes(String(doc.type)) || columnAliases.includes(String(doc.label)),
                        );
                        const tone =
                          cell === "Received"
                            ? "border border-[var(--color-green)] bg-[var(--color-green-light)] text-[var(--color-green)]"
                            : cell === "Under Review"
                              ? "border border-[var(--color-blue)] bg-[var(--color-blue-light)] text-[var(--color-blue)]"
                              : cell === "Clarification"
                                ? "border border-[var(--color-red-light)] bg-[var(--color-red-soft)] text-[var(--color-red)]"
                                : cell === "Required"
                                  ? "border border-[var(--color-amber-light)] bg-[var(--color-amber-light)] text-[var(--color-amber)]"
                                  : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-tertiary)] opacity-70";
                        return (
                          <td key={`${credit.id}-${column.label}`} className="px-2 py-2 align-middle">
                            <div className="flex min-w-[112px] flex-col gap-1">
                              <span className={`inline-flex w-fit rounded-[3px] px-[6px] py-[2px] text-[9px] ${tone}`}>
                                {cell}
                              </span>
                              {canAssignContributors && cell === "Required" && requirementSlot?.required ? (
                                <form action={assignCreditContributorAction} className="flex flex-col gap-1">
                                  <input type="hidden" name="project_id" value={params.id} />
                                  <input type="hidden" name="project_credit_id" value={credit.id} />
                                  <input type="hidden" name="document_type" value={requirementSlot.type} />
                                  <select
                                    name="assigned_user_id"
                                    defaultValue={requirementSlot.assigned_user_id ?? ""}
                                    aria-label={`Assign ${requirementSlot.label} for ${credit.credit_code}`}
                                    className="h-7 w-[132px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[10px] text-[var(--color-text-primary)]"
                                  >
                                    <option value="">Assign...</option>
                                    {contributorMembers.map((member) => (
                                      <option key={`${credit.id}-${requirementSlot.type}-${member.user_id}`} value={member.user_id}>
                                        {(member.full_name || member.member_email || member.role).slice(0, 28)} ({String(member.role).replace("_", " ")})
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="submit"
                                    className="h-6 w-[132px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[10px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-green)]"
                                  >
                                    Save
                                  </button>
                                </form>
                              ) : requirementSlot?.assigned_user_id ? (
                                <span className="max-w-[132px] truncate text-[9px] text-[var(--color-text-tertiary)]">
                                  {requirementSlot.assigned_name || requirementSlot.assigned_email || "Assigned"}
                                </span>
                              ) : null}
                            </div>
                          </td>
                        );
                      })}
                      <td className="mono px-3 py-2 text-right align-middle text-[12px] text-[var(--color-text-secondary)]">
                        {pct(credit.completion_pct)}
                      </td>
                      <td className="max-w-[240px] truncate px-3 py-2 align-middle text-[11px] text-[var(--color-text-secondary)]">
                        {credit.documents.length
                          ? `${credit.documents.length} file(s): ${credit.documents
                              .slice(0, 2)
                              .map((doc) => doc.file_name)
                              .join(", ")}${credit.documents.length > 2 ? "..." : ""}`
                          : "None"}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <Badge className={creditStatuses[creditStatus]}>{creditStatus.replace("_", " ")}</Badge>
                      </td>
                      <td
                        className={`max-w-[260px] truncate px-3 py-2 align-middle text-[11px] ${
                          credit.remarks[0]?.body
                            ? "italic text-[var(--color-text-secondary)]"
                            : "text-[var(--color-text-tertiary)]"
                        }`}
                      >
                        {preview}
                      </td>
                      <td className="px-3 py-2 align-middle text-[11px] text-[var(--color-text-secondary)]">
                        {credit.responsible_role ? String(credit.responsible_role).replace("_", " ") : "Unassigned"}
                      </td>
                      <td className="mono px-3 py-2 text-right align-middle text-[12px] text-[var(--color-text-secondary)]">
                        {Number((credit as any).max_points ?? (credit as any).available_points ?? 0).toFixed(1)}
                      </td>
                      <td className="mono px-3 py-2 text-right align-middle text-[12px] text-[var(--color-text-secondary)]">
                        {Number(((credit as any).achievable_points ?? ((credit as any).max_points ?? 0) * ((credit.completion_pct ?? 0) / 100))).toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="sticky top-4 h-fit rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="border-b border-[var(--color-border)] px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
                  {selectedCredit.credit_name}
                </h2>
                <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">
                  {selectedCredit.category} / {mandatoryCode(selectedCredit.credit_code, selectedCredit.is_mandatory)}
                </p>
              </div>
              <Badge className={creditStatuses[toLegacyCreditStatus(selectedCredit.state ?? selectedCredit.status)]}>
                {toLegacyCreditStatus(selectedCredit.state ?? selectedCredit.status).replace("_", " ")}
              </Badge>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4">
            {toLegacyCreditStatus(selectedCredit.state ?? selectedCredit.status) === "blocked" ? (
              <div className="rounded-lg border border-[var(--color-red-light)] bg-[var(--color-red-light)] p-3 text-[11px] text-[var(--color-red)]">
                <div className="flex items-center gap-2 font-medium">
                  <FileWarning className="h-3.5 w-3.5" />
                  Blocked by {selectedCredit.blocked_by ?? "consultant"}
                </div>
                <p className="mt-1 text-[var(--color-text-secondary)]">
                  {selectedCredit.remarks[0]?.body ?? "A blocking remark is pending."}
                </p>
              </div>
            ) : null}

            {canReview ? (
              <AiGuidePanel
                context={validationAssistantContext}
                enabled={env.aiReady}
                storageKey={`tracknov-ai-validation-${params.id}-${selectedCredit.id}`}
                title="AI Validation Assistant"
                description="Use the current credit checklist, uploaded documents, remarks, and review stage to help decide whether the evidence is ready, incomplete, or should be excluded."
                prompts={[
                  "Validate this uploaded document against the credit checklist.",
                  "What is missing before this can go into the submission pack?",
                  "Draft a concise rejection note if this evidence is insufficient.",
                  "What should I ask the Project Owner to upload next?",
                ]}
                suggestedActions={[
                  {
                    label: "Open documents library",
                    href: `/documents?project=${params.id}`,
                    description: "Review all uploaded files mapped to this project.",
                  },
                  {
                    label: "Open submission pack",
                    href: `/projects/${params.id}/submission`,
                    description: "Check what is already eligible for final inclusion.",
                  },
                ]}
              />
            ) : null}

            <section>
              <p className="dense-label">What to submit</p>
              <p className="mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-[11px] leading-5 text-[var(--color-text-secondary)]">
                {selectedCredit.what_to_submit?.trim() || selectedCredit.documentation_summary || "Guidance is not set yet for this credit."}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedCredit.sample_document_url ? (
                  <Button variant="secondary" asChild className="h-7 rounded-md px-3 text-[11px]">
                    <Link href={selectedCredit.sample_document_url} target="_blank">
                      Open sample document
                    </Link>
                  </Button>
                ) : null}
                <Button variant="secondary" asChild className="h-7 rounded-md px-3 text-[11px]">
                  <Link href="https://wa.me/?text=Tracknov%20support%20needed%20for%20credit%20upload" target="_blank">
                    Not sure what to upload? (50 tokens / 1h consult)
                  </Link>
                </Button>
              </div>
            </section>

            <section className="grid gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="dense-label">Effort profile</p>
                <Badge className="border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
                  {(selectedCredit.effort_level ?? "moderate").toUpperCase()}
                </Badge>
              </div>
              <p className="text-[11px] leading-5 text-[var(--color-text-secondary)]">
                {selectedCredit.effort_guidance?.trim() || "Define cost/effort guidance for this credit."}
              </p>
            </section>

            <section>
              <p className="dense-label">Document checklist</p>
              <div className="mt-2 space-y-2">
                {selectedCredit.documents_required.map((doc) => {
                  const matchingDocs = selectedCredit.documents.filter((file) => file.doc_category === doc.type);
                  const hasApproved = matchingDocs.some((file) => file.status === "approved");
                  const hasUploaded = matchingDocs.some((file) => file.status === "uploaded");
                  const hasOwnerApproved = matchingDocs.some((file) => file.status === "owner_approved");
                  const hasRejected = matchingDocs.some((file) => file.status === "rejected");
                  const short = docAbbreviations[doc.type] ?? doc.label.slice(0, 4).toUpperCase();
                  const checklistState = !matchingDocs.length
                    ? "Not started"
                    : hasApproved
                      ? "Approved"
                      : hasRejected && !hasUploaded && !hasOwnerApproved
                        ? "Rejected"
                        : "Uploaded";
                  return (
                    <div key={doc.type} className="flex h-7 items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-[var(--color-surface-2)] text-[9px] font-medium text-[var(--color-text-secondary)]">
                        {short}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] text-[var(--color-text-primary)]">{doc.label}</p>
                        <p className="truncate text-[10px] text-[var(--color-text-tertiary)]">
                          {doc.required ? "Required for review" : "Not required for this credit"} / {checklistState}
                        </p>
                      </div>
                      {doc.required ? (
                        checklistState === "Approved" ? (
                          <CheckCircle2 className="h-4 w-4 text-[var(--color-green)]" />
                        ) : checklistState === "Rejected" ? (
                          <AlertTriangle className="h-4 w-4 text-[var(--color-red)]" />
                        ) : (
                          <Circle className="h-4 w-4 text-[var(--color-border-strong)]" />
                        )
                      ) : (
                        <span className="mono text-[10px] text-[var(--color-text-tertiary)]">NA</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {canAssignTasks(workspace.userRole) && (
              <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                <p className="text-[11px] font-medium text-[var(--color-text-primary)]">Assign Responsibility</p>
                <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                  Assign this credit to a Project Manager or Owner.
                </p>
                <form action={createTaskAction} className="mt-3 space-y-2">
                  <input type="hidden" name="project_id" value={params.id} />
                  <input type="hidden" name="credit_id" value={selectedCredit.id} />
                  <input type="hidden" name="task_type" value="credit_documentation" />
                  
                  <select 
                    name="assigned_to" 
                    required
                    className="h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[11px] outline-none"
                  >
                    <option value="">Select Assignee</option>
                    {workspace.members
                      .filter(m => ["owner", "project_admin", "client", "consultant"].includes(m.role))
                      .map(m => (
                        <option key={m.user_id} value={m.user_id}>
                          {cleanRoleLabel(m.member_email)} ({cleanRoleLabel(m.role).toUpperCase()})
                        </option>
                      ))}
                  </select>

                  <div className="flex gap-2">
                    <select 
                      name="priority" 
                      className="h-8 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[11px] outline-none"
                    >
                      <option value="LOW">Low Priority</option>
                      <option value="MEDIUM" selected>Medium Priority</option>
                      <option value="HIGH">High Priority</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                    <input 
                      type="date" 
                      name="due_date"
                      className="h-8 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[11px] outline-none"
                    />
                  </div>

                  <Button type="submit" className="h-7 w-full rounded-md text-[11px]">
                    Create Assignment
                  </Button>
                </form>
              </section>
            )}

            {canConfigureDocRequirements ? (
              <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                <p className="text-[11px] font-medium text-[var(--color-text-primary)]">Document Type Requirements</p>
                <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                  Set active/inactive document blocks for this credit. Active types are required.
                </p>
                <form action={updateCreditDocumentRequirementsAction} className="mt-3 space-y-3">
                  <input type="hidden" name="project_id" value={params.id} />
                  <input type="hidden" name="credit_id" value={selectedCredit.id} />
                  <div className="grid grid-cols-2 gap-2">
                    {selectedCredit.documents_required.map((doc) => (
                      <label key={doc.type} className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[11px] text-[var(--color-text-secondary)]">
                        <input
                          type="checkbox"
                          name="required_doc_types"
                          value={doc.type}
                          defaultChecked={doc.required}
                          className="h-3.5 w-3.5 rounded border-[var(--color-border)]"
                        />
                        <span className="truncate">{docAbbreviations[doc.type] ?? doc.label}</span>
                      </label>
                    ))}
                  </div>
                  <Button type="submit" variant="secondary" className="h-7 w-full rounded-md text-[11px]">
                    Save Requirements
                  </Button>
                </form>
              </section>
            ) : null}

            {canConfigureDocRequirements ? (
              <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                <p className="text-[11px] font-medium text-[var(--color-text-primary)]">Validation Rules</p>
                <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                  Add per-credit validation rules used during submission gate checks.
                </p>
                <form action={createValidationRuleAction} className="mt-2 grid gap-2">
                  <input type="hidden" name="project_id" value={params.id} />
                  <input type="hidden" name="project_credit_id" value={selectedCredit.id} />
                  <input type="hidden" name="credit_id" value={selectedCredit.id} />
                  <input
                    name="rule_name"
                    placeholder="Rule name (e.g. Must mention plant count)"
                    className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none"
                    required
                  />
                  <input
                    name="doc_category"
                    placeholder="Doc type (optional, e.g. Drawing)"
                    className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none"
                  />
                  <input
                    name="required_keywords"
                    placeholder="Required keywords (comma-separated)"
                    className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none"
                  />
                  <select
                    name="severity"
                    defaultValue="error"
                    className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none"
                  >
                    <option value="error">Error (block transition)</option>
                    <option value="warning">Warning (allow transition)</option>
                  </select>
                  <Button type="submit" variant="secondary" className="h-7 w-full rounded-md text-[11px]">
                    Add validation rule
                  </Button>
                </form>
                <div className="mt-2 space-y-1">
                  {selectedCreditValidationRules.length === 0 ? (
                    <p className="text-[10px] text-[var(--color-text-tertiary)]">No custom validation rules yet.</p>
                  ) : (
                    selectedCreditValidationRules.slice(0, 6).map((rule: any) => (
                      <div key={rule.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[10px]">
                        <p className="font-medium text-[var(--color-text-primary)]">{rule.rule_name}</p>
                        <p className="mt-1 text-[var(--color-text-tertiary)]">
                          {(rule.doc_category || "Any doc type")} / {rule.severity.toUpperCase()} / keywords: {(rule.required_keywords ?? []).join(", ") || "none"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            ) : null}

            {canAssignContributors ? (
              <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                <p className="text-[11px] font-medium text-[var(--color-text-primary)]">Assign Contributor</p>
                <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                  Assign this credit to one contributor. Only the assigned contributor can upload/update documents for this credit.
                </p>
                <form action={assignCreditContributorAction} className="mt-2 grid gap-2">
                  <input type="hidden" name="project_id" value={params.id} />
                  <input type="hidden" name="project_credit_id" value={selectedCredit.id} />
                  <select
                    name="assigned_user_id"
                    defaultValue={selectedCredit.assigned_user_id ?? ""}
                    className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
                  >
                    <option value="">Unassigned</option>
                    {contributorMembers.map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {(member.member_email ?? member.user_id).toString()} / {String(member.role).toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="secondary" className="rounded-md px-3 text-[12px]">
                    Save assignment
                  </Button>
                </form>
              </section>
            ) : null}

            <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
              <p className="text-[11px] font-medium text-[var(--color-text-primary)]">Project activity log (IST)</p>
              <div className="mt-2 space-y-2">
                {(workspace.activityLogs ?? []).length ? (
                  (workspace.activityLogs ?? []).slice(0, 8).map((log) => (
                    <div key={log.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2">
                      <p className="text-[11px] text-[var(--color-text-primary)]">{log.summary}</p>
                      <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                        {formatDateTimeIST(log.created_at)} / {log.actor_role ?? "system"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-[var(--color-text-tertiary)]">No project activity recorded yet.</p>
                )}
              </div>
            </section>

            {workspace.tasks && workspace.tasks.length > 0 && (
              <section className="space-y-3">
                <p className="dense-label">Active Assignments</p>
                {workspace.tasks.map(task => (
                  <TaskDetailPanel 
                    key={task.id}
                    task={{
                      ...task,
                      project: { name: workspace.project.name },
                      credit: workspace.credits.find(c => c.id === task.credit_id)
                    }}
                    currentUserId={user?.id || ""}
                    currentUserRole={workspace.userRole}
                    projectMembers={workspace.members.map(m => ({
                      user_id: m.user_id,
                      full_name: m.member_email || "User",
                      role: m.role,
                      email: m.member_email || ""
                    }))}
                  />
                ))}
              </section>
            )}

            {canConfigureDocRequirements ? (
              <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                <p className="text-[11px] font-medium text-[var(--color-text-primary)]">Client Guidance Controls</p>
                <form action={updateCreditGuidanceAction} className="mt-2 grid gap-2">
                  <input type="hidden" name="project_id" value={params.id} />
                  <input type="hidden" name="credit_id" value={selectedCredit.id} />
                  <Textarea
                    name="what_to_submit"
                    defaultValue={selectedCredit.what_to_submit ?? selectedCredit.documentation_summary ?? ""}
                    className="min-h-[78px]"
                    placeholder="What should the client upload for this credit?"
                  />
                  <select
                    name="effort_level"
                    defaultValue={selectedCredit.effort_level ?? "moderate"}
                    className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
                  >
                    <option value="easy">Easy</option>
                    <option value="moderate">Moderate</option>
                    <option value="hard">Hard</option>
                  </select>
                  <Textarea
                    name="effort_guidance"
                    defaultValue={selectedCredit.effort_guidance ?? ""}
                    className="min-h-[62px]"
                    placeholder="Cost and effort guidance for this credit."
                  />
                  <Button type="submit" variant="secondary" className="rounded-md px-3 text-[12px]">
                    Save guidance
                  </Button>
                </form>
              </section>
            ) : null}

            <section>
              <p className="dense-label">Uploaded files</p>
              <div className="mt-2 space-y-2">
                {selectedCredit.documents.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-4 text-center">
                    <p className="text-[11px] text-[var(--color-text-primary)]">No files uploaded</p>
                    <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                      Upload a required document to start review.
                    </p>
                  </div>
                ) : (
                  selectedCredit.documents.map((document) => (
                    <div key={document.id} className="rounded-lg border border-[var(--color-border)] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-medium text-[var(--color-text-primary)]">
                            {document.file_name}
                          </p>
                          <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                            {document.doc_category}
                          </p>
                        </div>
                        <Badge
                          className={
                            document.status === "approved"
                              ? "border border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[var(--color-green)]"
                              : document.status === "owner_approved"
                                ? "border border-[var(--color-blue-light)] bg-[var(--color-blue-light)] text-[var(--color-blue)]"
                              : document.status === "rejected"
                                ? "border border-[var(--color-red-light)] bg-[var(--color-red-light)] text-[var(--color-red)]"
                                : "border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]"
                          }
                        >
                          {document.status === "uploaded"
                            ? "owner review"
                            : document.status === "owner_approved"
                              ? "admin review"
                              : document.status}
                        </Badge>
                      </div>

                      {canReview ? (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                              Document preview
                            </p>
                            <Link
                              href={`/api/documents/${document.id}`}
                              target="_blank"
                              className="text-[10px] text-[var(--color-green)] hover:text-[var(--color-green-dim)]"
                            >
                              Open full screen
                            </Link>
                          </div>
                          <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                            <iframe
                              src={`/api/documents/${document.id}`}
                              title={`Preview ${document.file_name}`}
                              className="h-[220px] w-full"
                            />
                          </div>
                        </div>
                      ) : null}

                      {canReview ? (
                        <div className="mt-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-[11px] text-[var(--color-text-secondary)]">
                          Review actions are handled in the governed review queue so this credit screen remains context-only.
                          <Link href="/review-queue" className="ml-1 text-[var(--color-green)] hover:text-[var(--color-green-dim)]">
                            Open review queue
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </section>

            {canUpload ? (
              <UploadDocumentForm
                projectId={params.id}
                creditId={selectedCredit.id}
                projectCreditId={(selectedCredit as any).project_credit_id ?? selectedCredit.id}
                docTypes={selectedCredit.documents_required.map((doc) => doc.type)}
                disabled={!env.isConfigured || !selectedCredit.documents_required.length}
              />
            ) : null}

            <section>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-amber)]" />
                <p className="dense-label">Remarks</p>
              </div>
              <div className="mt-2 space-y-2">
                {selectedCredit.remarks.length === 0 ? (
                  <div className="rounded-lg border border-[var(--color-border)] px-3 py-3 text-[11px] text-[var(--color-text-tertiary)]">
                    No remarks yet.
                  </div>
                ) : (
                  selectedCredit.remarks.map((remark) => (
                    <div
                      key={remark.id}
                      className={`rounded-lg border border-[var(--color-border)] px-3 py-3 text-[11px] ${
                        remark.body ? "border-l-2 border-l-[var(--color-amber)]" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                        <span>{remark.role}</span>
                        <span>{formatDateTimeIST(remark.created_at)}</span>
                      </div>
                      <p className="mt-2 text-[11px] text-[var(--color-text-secondary)]">{remark.body}</p>
                    </div>
                  ))
                )}
              </div>
              {canReview && (
                <form action={addRemarkAction} className="mt-2 space-y-2">
                  <input type="hidden" name="project_id" value={params.id} />
                  <input type="hidden" name="credit_id" value={selectedCredit.id} />
                  <input type="hidden" name="role" value={workspace.userRole} />
                  <Textarea name="body" placeholder="Add a validation note or follow-up" />
                  <Button type="submit" className="h-8 w-full rounded-md">
                    Add remark
                  </Button>
                </form>
              )}
            </section>

            {canReview ? (
              <section className="space-y-2 border-t border-[var(--color-border)] pt-4">
                <form action={setCreditStateAction}>
                  <input type="hidden" name="project_id" value={params.id} />
                  <input type="hidden" name="credit_id" value={selectedCredit.id} />
                  <input type="hidden" name="action" value="complete" />
                  <Button type="submit" className="h-8 w-full rounded-md">
                    Mark complete
                  </Button>
                </form>
                <form action={setCreditStateAction} className="space-y-2">
                  <input type="hidden" name="project_id" value={params.id} />
                  <input type="hidden" name="credit_id" value={selectedCredit.id} />
                  <input type="hidden" name="action" value="blocked" />
                  <select
                    name="blocked_by"
                    className="h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[11px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
                    defaultValue="owner"
                  >
                    <option value="owner">Blocked by owner</option>
                    <option value="consultant">Blocked by consultant</option>
                    <option value="igbc">Blocked by IGBC</option>
                  </select>
                  <Button type="submit" variant="danger" className="h-8 w-full rounded-md">
                    Set blocked
                  </Button>
                </form>
              </section>
            ) : null}
          </div>
        </aside>
      </div>
    </Shell>
  );
}
