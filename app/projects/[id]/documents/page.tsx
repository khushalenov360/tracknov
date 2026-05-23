import { CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
            <p className="text-xs leading-relaxed text-[var(--color-text-secondary)] bg-[var(--color-surface-2)] p-2.5 rounded border border-[var(--color-border)]">
              {selectedCredit.what_to_submit || "No instructions provided."}
            </p>
          </div>

          <CreditRequirementsManager
            projectId={projectId}
            creditId={selectedCredit.id}
            documentsRequired={selectedCredit.documents_required}
            documents={selectedCredit.documents || []}
            members={workspace.members}
            canManage={canFinalReview}
          />
        </div>

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
      </div>

      <div className="space-y-4">
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
    </div>
  );
}
