import Link from "next/link";
import { AlertTriangle, CheckCircle2, Circle, Download, FileWarning, ShieldCheck } from "lucide-react";
import {
  addRemarkAction,
  setCreditStateAction,
  setDocumentStatusAction,
  updateCreditGuidanceAction,
  updateCreditDocumentRequirementsAction,
} from "@/app/actions";
import { AiGuidePanel } from "@/components/assistant/ai-guide-panel";
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
import { canReviewProjectDocuments, canUploadProjectDocuments } from "@/lib/rbac";
import { formatDateTimeIST, pct } from "@/lib/utils";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: { id: string };
  searchParams?: {
    category?: string;
    status?: string;
    credit?: string;
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
  cookies();
  const workspace = await getProjectWorkspace(params.id);
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
  const roleScopedCredits = isL0Contributor
    ? workspace.credits.filter((credit) => !credit.responsible_role || credit.responsible_role === workspace.userRole)
    : workspace.credits;
  const stats = creditStats(roleScopedCredits);
  const selectedCredit =
    roleScopedCredits.find((credit) => credit.id === searchParams?.credit) ?? roleScopedCredits[0];
  const filteredCredits = roleScopedCredits.filter((credit) => {
    const categoryOk = searchParams?.category ? credit.category === searchParams.category : true;
    const statusOk = searchParams?.status ? credit.status === searchParams.status : true;
    return categoryOk && statusOk;
  });
  const mandatoryCredits = roleScopedCredits.filter((credit) => credit.is_mandatory);
  const mandatoryComplete = mandatoryCredits.filter((credit) => credit.status === "complete").length;
  const canReview = canReviewProjectDocuments(workspace.userRole);
  const canUpload = canUploadProjectDocuments(workspace.userRole);
  const canOwnerReview = ["owner", "super_user"].includes(workspace.userRole);
  const canFinalReview = ["project_admin", "super_admin", "super_user"].includes(workspace.userRole);
  const canConfigureDocRequirements = ["project_admin", "super_user"].includes(workspace.userRole);
  const reviewableDocuments = selectedCredit.documents.filter((document) =>
    canOwnerReview ? document.status === "uploaded" : canFinalReview ? document.status === "owner_approved" : false,
  );
  const selectedReviewDocument = reviewableDocuments[0] ?? selectedCredit.documents[0] ?? null;
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
    const completed = categoryCredits.filter((credit) => credit.status === "complete").length;
    const inProgress = categoryCredits.filter((credit) => credit.status === "in_progress").length;
    const blocked = categoryCredits.filter((credit) => credit.status === "blocked").length;
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

  if (!selectedCredit) {
    return (
      <Shell
        title={workspace.project.name}
        description={`${workspace.project.certification_type} / ${workspace.project.client || "Client TBD"}`}
        role={workspace.userRole}
        notificationCount={workspace.notifications.filter((item) => !item.read_at).length}
      >
        <section className="surface-card px-5 py-8">
          <p className="text-[15px] font-medium text-[var(--color-text-primary)]">Rating system selected</p>
          <p className="mt-2 max-w-[720px] text-[13px] leading-6 text-[var(--color-text-secondary)]">
            This project is set up under {workspace.project.certification_type}. A detailed credit catalogue has
            not been loaded for this rating system yet, so the workspace is ready for project documents and team setup
            while the rating-specific tracker is configured.
          </p>
        </section>
      </Shell>
    );
  }

  return (
    <Shell
      title={workspace.project.name}
      description={`${workspace.project.certification_type} / Target ${workspace.project.target_rating}`}
      role={workspace.userRole}
      notificationCount={workspace.notifications.filter((item) => !item.read_at).length}
    >
      <section className="mb-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {categoryProgress.map((item) => {
          const meta = categoryMeta[item.key as keyof typeof categoryMeta];
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
                const meta = categoryMeta[item.key as keyof typeof categoryMeta];
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
                    <Badge className={classes}>{roleScopedCredits.filter((credit) => credit.status === status).length}</Badge>
                  </Link>
                );
              })}
            </div>
          </div>

          {isL0Contributor ? (
            <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <p className="text-[11px] font-medium text-[var(--color-text-primary)]">My tasks</p>
              <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                {roleScopedCredits.filter((credit) => credit.status === "complete").length} of {roleScopedCredits.length} credits complete
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

        <section className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
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
                  {!isL0Contributor ? (
                    <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                      Credit code
                    </th>
                  ) : null}
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                    Credit name
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                    Doc types
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                    % complete
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                    Remark
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCredits.map((credit) => {
                  const selected = credit.id === selectedCredit.id;
                  const category = categoryMeta[credit.category as keyof typeof categoryMeta];
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
                      {!isL0Contributor ? (
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
                      ) : null}
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
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="flex flex-wrap gap-1">
                          {credit.documents_required.map((doc) => (
                            <span
                              key={doc.type}
                              className={`inline-flex rounded-[3px] px-[5px] py-[2px] text-[9px] ${
                                doc.required
                                  ? "border border-[var(--color-green)] bg-[var(--color-green-light)] text-[var(--color-green)]"
                                  : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-tertiary)] opacity-60"
                              }`}
                            >
                              {docAbbreviations[doc.type] ?? doc.label.slice(0, 4).toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="mono px-3 py-2 text-right align-middle text-[12px] text-[var(--color-text-secondary)]">
                        {pct(credit.completion_pct)}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <Badge className={creditStatuses[credit.status]}>{credit.status.replace("_", " ")}</Badge>
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
              <Badge className={creditStatuses[selectedCredit.status]}>
                {selectedCredit.status.replace("_", " ")}
              </Badge>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4">
            {selectedCredit.status === "blocked" ? (
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
                        <div className="mt-3 space-y-2">
                          {canOwnerReview && document.status === "uploaded" ? (
                            <form action={setDocumentStatusAction}>
                              <input type="hidden" name="project_id" value={params.id} />
                              <input type="hidden" name="credit_id" value={selectedCredit.id} />
                              <input type="hidden" name="document_id" value={document.id} />
                              <input type="hidden" name="status" value="owner_approved" />
                              <Button type="submit" className="h-7 w-full rounded-md text-[11px]">
                                Forward To Project Admin
                              </Button>
                            </form>
                          ) : null}
                          {canFinalReview && document.status === "owner_approved" ? (
                            <form action={setDocumentStatusAction}>
                              <input type="hidden" name="project_id" value={params.id} />
                              <input type="hidden" name="credit_id" value={selectedCredit.id} />
                              <input type="hidden" name="document_id" value={document.id} />
                              <input type="hidden" name="status" value="approved" />
                              <Button type="submit" className="h-7 w-full rounded-md text-[11px]">
                                Include In Submission Pack
                              </Button>
                            </form>
                          ) : null}
                          <form action={setDocumentStatusAction} className="space-y-2">
                            <input type="hidden" name="project_id" value={params.id} />
                            <input type="hidden" name="credit_id" value={selectedCredit.id} />
                            <input type="hidden" name="document_id" value={document.id} />
                            <input type="hidden" name="status" value="rejected" />
                            <select
                              name="rejection_type"
                              defaultValue="missing_data"
                              className="h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[11px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
                            >
                              <option value="missing_data">Missing required information</option>
                              <option value="incorrect_format">Incorrect format</option>
                              <option value="wrong_document">Wrong document type</option>
                              <option value="poor_quality">Poor image quality / unreadable</option>
                              <option value="outdated_document">Outdated document</option>
                              <option value="wrong_credit_mapping">Wrong credit mapping</option>
                            </select>
                            <input
                              name="rejection_remark"
                              placeholder="Specific correction note (minimum 20 characters)"
                              className="h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[11px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-border-strong)]"
                            />
                            <Button type="submit" variant="danger" className="h-7 w-full rounded-md text-[11px]">
                              Exclude
                            </Button>
                          </form>
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
              <form action={addRemarkAction} className="mt-2 space-y-2">
                <input type="hidden" name="project_id" value={params.id} />
                <input type="hidden" name="credit_id" value={selectedCredit.id} />
                <input type="hidden" name="role" value={workspace.userRole} />
                <Textarea name="body" placeholder="Add a validation note or follow-up" />
                <Button type="submit" className="h-8 w-full rounded-md">
                  Add remark
                </Button>
              </form>
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
