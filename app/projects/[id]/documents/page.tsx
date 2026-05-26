import { CheckCircle2, Circle, BookOpen, FileText, Info, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AiGuidePanel } from "@/components/assistant/ai-guide-panel";
import { UploadDocumentForm } from "@/components/project/upload-document-form";
import { CreditRequirementsManager } from "@/components/project/credit-requirements-manager";
import { getProjectWorkspace } from "@/lib/data";
import { canReviewProjectDocuments, canUploadProjectDocuments } from "@/lib/rbac";
import { env } from "@/lib/env";
import type { AssistantContext } from "@/lib/assistant";

export const dynamic = "force-dynamic";

function mandatoryCode(creditCode: string, mandatory: boolean) {
  if (!mandatory || creditCode.includes("MR")) {
    return creditCode;
  }
  const parts = creditCode.split(" ");
  return `${parts[0]} MR ${parts.slice(1).join(" ")}`.trim();
}

function renderFormattedGuidelines(text: string) {
  if (!text) return null;
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  return (
    <div className="space-y-1.5">
      {lines.map((line, idx) => {
        // Detect main numbering (e.g., "1. ", "2. ", "10. ")
        const mainMatch = line.match(/^(\d+)\.\s*(.*)/);
        if (mainMatch) {
          return (
            <div key={idx} className="font-bold text-[var(--color-text-primary)] mt-3 first:mt-0 flex gap-2 items-start text-xs">
              <span className="text-[var(--color-green)] shrink-0 font-extrabold">{mainMatch[1]}.</span>
              <span>{mainMatch[2]}</span>
            </div>
          );
        }
        
        // Detect sub numbering (e.g., "a. ", "b. ", "i. ")
        const subMatch = line.match(/^([a-z])\.\s*(.*)/i);
        if (subMatch) {
          return (
            <div key={idx} className="pl-5 text-[var(--color-text-secondary)] flex gap-2 items-start text-xs leading-relaxed">
              <span className="text-[var(--color-green)] opacity-85 shrink-0 font-bold">{subMatch[1]}.</span>
              <span>{subMatch[2]}</span>
            </div>
          );
        }
        
        // Default line
        return (
          <p key={idx} className="text-xs text-[var(--color-text-secondary)] pl-3 leading-relaxed">
            {line}
          </p>
        );
      })}
    </div>
  );
}

export default async function ProjectDocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ credit?: string }>;
}) {
  const { id: projectId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const workspace = await getProjectWorkspace(projectId);

  if (!workspace) return null;

  const isL0Contributor = ["mep", "architect", "contractor"].includes(workspace.userRole);
  const roleScopedCredits = isL0Contributor
    ? workspace.credits.filter((credit: any) => !credit.responsible_role || credit.responsible_role === workspace.userRole)
    : workspace.credits;

  const selectedCredit = roleScopedCredits.find((credit: any) => credit.id === resolvedSearchParams?.credit) ?? roleScopedCredits[0];

  if (!selectedCredit) {
    return (
      <div className="surface-card p-8 text-center text-xs text-[var(--color-text-secondary)]">
        No credits available or selected.
      </div>
    );
  }

  const canOwnerReview = ["owner", "super_user", "L1", "L5"].includes(workspace.userRole);
  const canFinalReview = ["project_admin", "super_admin", "super_user", "L3", "L5"].includes(workspace.userRole);
  const canUpload = canUploadProjectDocuments(workspace.userRole);
  const canReview = canReviewProjectDocuments(workspace.userRole);

  const reviewableDocuments = (selectedCredit.documents || []).filter((document: any) =>
    canOwnerReview ? document.status === "uploaded" : canFinalReview ? document.status === "owner_approved" : false,
  );
  const selectedReviewDocument = reviewableDocuments[0] ?? selectedCredit.documents?.[0] ?? null;

  const aiFacts = [
    `Selected credit: ${mandatoryCode(selectedCredit.credit_code, selectedCredit.is_mandatory)} ${selectedCredit.credit_name}.`,
    `Required document types: ${
      selectedCredit.documents_required.filter((doc: any) => doc.required).map((doc: any) => doc.label).join(", ") || "none"
    }.`,
    `Uploaded files on this credit: ${
      selectedCredit.documents.map((document: any) => `${document.file_name} (${document.status})`).join(", ") || "none"
    }.`,
    `Current user role: ${workspace.userRole}.`,
    `What to submit guidance: ${selectedCredit.what_to_submit || selectedCredit.documentation_summary || "Not set"}.`,
    `Effort profile: ${selectedCredit.effort_level ?? "moderate"}; guidance: ${selectedCredit.effort_guidance ?? "Not set"}.`,
    workspace.guidebooks?.[0]
      ? `Project guidebook in force: ${workspace.guidebooks[0].file_name}.`
      : "No project guidebook uploaded yet.",
    canFinalReview
      ? "Project Admin final approval is required before a document can be included in the submission pack."
      : canOwnerReview
        ? "Project Manager (PM) reviews first and forwards valid files to Project Admin."
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
      .filter((doc: any) => doc.required && !selectedCredit.documents.some((file: any) => file.doc_category === doc.type))
      .map((doc: any) => `Missing required file type: ${doc.label}.`)[0] ?? "All required document types have at least one uploaded file.",
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

  return (
    <div className="space-y-4">
      <div className="flex items-center text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-2">
        <a href={`/projects/${projectId}`} className="flex items-center gap-1.5 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          Back to project overview
        </a>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6 text-left items-start">
        <div className="space-y-4">
        <div className="surface-card p-4 space-y-3.5">
          <div className="border-b border-[var(--color-border)] pb-2">
            <span className="text-xs uppercase font-black text-slate-500">Active Credit</span>
            <h4 className="text-xs font-bold text-[var(--color-text-primary)] truncate">
              {selectedCredit.credit_code}: {selectedCredit.credit_name}
            </h4>
          </div>

          <div className="space-y-1">
            <span className="text-xs uppercase font-black text-slate-500">Expectations</span>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-3">
              {selectedCredit.what_to_submit || "No detailed submission guidance provided."}
            </p>
          </div>

          <div className="pt-2 border-t border-[var(--color-border)] space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--color-border)]">
              <span className="text-xs font-medium text-slate-500">Credit Owner</span>
              <span className="text-sm font-bold text-[var(--color-text-primary)] uppercase">
                {(() => {
                  if (selectedCredit.responsible_role) return String(selectedCredit.responsible_role).toUpperCase();
                  const assignedDocs = selectedCredit.documents_required?.filter((d: any) => d.assigned_role || d.assigned_name) || [];
                  if (assignedDocs.length === 0) return "UNASSIGNED";
                  const uniqueRoles = Array.from(new Set(assignedDocs.map((d: any) => d.assigned_role).filter(Boolean)));
                  if (uniqueRoles.length === 1) return String(uniqueRoles[0]).replace("_", " ");
                  if (uniqueRoles.length > 1) return "MIXED CONTRIBUTORS";
                  return "ASSIGNED";
                })()}
              </span>
            </div>

          <CreditRequirementsManager
            projectId={projectId}
            creditId={selectedCredit.id}
            documentsRequired={selectedCredit.documents_required}
            documents={(selectedCredit.documents || []).map((d: any) => ({ id: d.id, doc_category: d.doc_category, status: d.workflow_state || d.status || "" }))}
            members={workspace.members}
            canManage={canFinalReview}
          />
        </div>
        </div>

        {canUpload && (
          <UploadDocumentForm
            projectId={projectId}
            creditId={selectedCredit.id}
            projectCreditId={selectedCredit.id}
            docTypes={selectedCredit.documents_required.map((doc: any) => doc.type)}
            disabled={!env.isConfigured || !selectedCredit.documents_required.length}
          />
        )}

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

        <div className="space-y-4 min-w-0">
          <div className="surface-card p-4 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-primary)]">
              Uploaded Evidence Files ({selectedCredit.documents.length})
            </h4>
            <div className="space-y-2">
              {selectedCredit.documents.length > 0 ? (
                selectedCredit.documents.map((doc: any) => (
                  <div key={doc.id} className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-3 text-xs space-y-2">
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-bold text-[var(--color-text-primary)] truncate max-w-[70%]">{doc.file_name}</span>
                      <Badge className="text-xs font-black uppercase shrink-0">{doc.status}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`/api/documents/${doc.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[var(--color-green)] font-bold hover:underline"
                      >
                        Download PDF
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 border border-dashed border-[var(--color-border)] text-center rounded-lg text-slate-400">
                  <p className="text-xs font-medium">No files uploaded yet.</p>
                </div>
              )}
            </div>
          </div>

          <div className="surface-card p-5 space-y-4 border border-[var(--color-border)] rounded-xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[var(--color-green)] shrink-0" />
                <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-primary)]">
                  Credit Reference & Guidelines
                </h4>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {selectedCredit.is_mandatory ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 text-[10px] font-black uppercase tracking-wider">
                    Mandatory
                  </Badge>
                ) : (
                  <Badge className="bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/30 text-[10px] font-black uppercase tracking-wider">
                    Optional ({selectedCredit.available_points || 0} Pts)
                  </Badge>
                )}
                {selectedCredit.effort_level && (
                  <Badge className={cn(
                    "text-[10px] font-black uppercase tracking-wider border",
                    selectedCredit.effort_level === "easy" && "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30",
                    selectedCredit.effort_level === "moderate" && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
                    selectedCredit.effort_level === "hard" && "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30"
                  )}>
                    Effort: {selectedCredit.effort_level}
                  </Badge>
                )}
              </div>
            </div>

            {selectedCredit.documentation_summary && (
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Summary & Scope</span>
                <div className="bg-[var(--color-surface-2)] p-4 rounded-xl border border-[var(--color-border)] shadow-inner">
                  {renderFormattedGuidelines(selectedCredit.documentation_summary)}
                </div>
              </div>
            )}

            {selectedCredit.what_to_submit && (
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Full Submission Guidance</span>
                <div className="bg-[var(--color-surface-2)] p-4 rounded-xl border border-[var(--color-border)] shadow-inner">
                  {renderFormattedGuidelines(selectedCredit.what_to_submit)}
                </div>
              </div>
            )}

            {selectedCredit.effort_guidance && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Implementation Tips</span>
                <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/60 p-3 rounded-lg flex gap-2">
                  <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>{selectedCredit.effort_guidance}</span>
                </div>
              </div>
            )}

            {selectedCredit.sample_document_url && (
              <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span>Sample template is available</span>
                </div>
                <a
                  href={selectedCredit.sample_document_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-green)] hover:bg-[var(--color-green-strong)] text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Sample
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
