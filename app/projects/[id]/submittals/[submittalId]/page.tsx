import Link from "next/link";
import { submitDocumentTransitionAction } from "@/app/actions";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WorkflowStatePanel } from "@/components/workflow/workflow-state-panel";
import { getCurrentUser } from "@/lib/data";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { formatDateTimeIST } from "@/lib/utils";
import { workflowStateRenderer } from "@/lib/workflow/state-renderer";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string; submittalId: string }>;
};

async function getReviewEnvelope(projectId: string, submittalId: string) {
  if (!env.isConfigured) return null;
  const client = createClient();

  const { data: document } = await client
    .from("project_document")
    .select("id, project_id, credit_id, submittal_id, file_name, file_type, doc_category, notes, state, status, version, is_latest, uploaded_by, uploaded_at")
    .eq("project_id", projectId)
    .or(`submittal_id.eq.${submittalId},id.eq.${submittalId}`)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!document) return null;

  const [projectRes, creditRes, versionsRes, validationRes, auditRes] = await Promise.all([
    client.from("projects").select("id, name, certification_type").eq("id", projectId).maybeSingle(),
    (document as any).credit_id
      ? client.from("project_credits").select("id, credit_code, credit_name, documentation_summary, what_to_submit").eq("id", (document as any).credit_id).maybeSingle()
      : Promise.resolve({ data: null }),
    client
      .from("document_versions")
      .select("id, version, file_name, created_at, created_by")
      .eq("document_id", (document as any).id)
      .order("version", { ascending: false })
      .limit(10),
    client
      .from("validation_results")
      .select("id, rule_id, status, message, created_at")
      .eq("entity_id", (document as any).id)
      .order("created_at", { ascending: false })
      .limit(8),
    client
      .from("document_activity_logs")
      .select("id, action, actor_name, actor_role, summary, details, created_at")
      .eq("document_id", (document as any).id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  return {
    document: document as any,
    project: projectRes.data as any,
    credit: creditRes.data as any,
    versions: versionsRes.data ?? [],
    validations: validationRes.data ?? [],
    audit: auditRes.data ?? [],
  };
}

function actionTarget(action: string) {
  if (action === "start_owner_review" || action === "start_admin_review") return "UNDER_REVIEW";
  if (action === "approve") return "APPROVED";
  if (action === "request_clarification") return "CLARIFICATION";
  if (action === "reject") return "REJECTED";
  if (action === "resubmit") return "RESUBMITTED";
  return "";
}

function actionLabel(action: string) {
  if (action === "start_owner_review") return "Start owner review";
  if (action === "start_admin_review") return "Start admin validation";
  if (action === "approve") return "Confirm approval";
  if (action === "request_clarification") return "Request clarification";
  if (action === "reject") return "Reject";
  if (action === "resubmit") return "Resubmit";
  return action.replaceAll("_", " ");
}

export default async function SubmittalReviewPage({ params }: PageProps) {
  const { id: projectId, submittalId } = await params;
  const [user, envelope] = await Promise.all([getCurrentUser(), getReviewEnvelope(projectId, submittalId)]);
  const role = user?.role ?? "consultant";

  if (!envelope) {
    return (
      <Shell title="Submittal Not Found" description="The requested review item could not be loaded." role={role} notificationCount={0}>
        <section className="surface-card p-6">
          <p className="text-[13px] text-[var(--color-text-secondary)]">No matching submittal or document was found for this project.</p>
          <Button asChild variant="secondary" className="mt-4 rounded-md px-3 text-[12px]">
            <Link href={`/projects/${projectId}`}>Back to project</Link>
          </Button>
        </section>
      </Shell>
    );
  }

  const workflow = workflowStateRenderer(envelope.document.state ?? envelope.document.status);
  const allowedActions = workflow.allowedActions
    .map((action) => ({ action, target: actionTarget(action), label: actionLabel(action) }))
    .filter((item) => item.target);

  return (
    <Shell
      title="Submittal Review"
      description={`${envelope.project?.name ?? "Project"} / ${envelope.credit?.credit_name ?? "Credit evidence"}`}
      role={role}
      notificationCount={0}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-4">
          <section className="surface-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-medium text-[var(--color-text-primary)]">{envelope.document.file_name}</p>
                <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
                  {envelope.credit?.credit_code ?? "Credit"} / {envelope.document.doc_category}
                </p>
              </div>
              <Button asChild variant="secondary" className="h-[32px] rounded-md px-3 text-[12px]">
                <Link href={`/projects/${projectId}`}>Back to credit context</Link>
              </Button>
            </div>
          </section>

          <section className="surface-card p-4">
            <p className="dense-label mb-2">Document viewer</p>
            <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]">
              <iframe src={`/api/documents/${envelope.document.id}`} title={envelope.document.file_name} className="h-[640px] w-full" />
            </div>
          </section>

          <section className="surface-card p-4">
            <p className="dense-label">Audit timeline</p>
            <div className="mt-3 space-y-2">
              {envelope.audit.length ? (
                envelope.audit.map((row: any) => (
                  <div key={row.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-[11px]">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[var(--color-text-tertiary)]">
                      <span>{formatDateTimeIST(row.created_at)}</span>
                      <span>{row.actor_name ?? row.actor_role ?? "System"}</span>
                    </div>
                    <p className="mt-1 text-[var(--color-text-primary)]">{row.summary ?? row.action}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-dashed border-[var(--color-border)] px-3 py-4 text-[12px] text-[var(--color-text-tertiary)]">
                  No audit events are available for this evidence item.
                </p>
              )}
            </div>
          </section>
        </main>

        <aside className="space-y-4">
          <WorkflowStatePanel render={workflow} assignedReviewer={role} />

          <section className="surface-card p-4">
            <p className="dense-label">Validation panel</p>
            <div className="mt-3 space-y-2">
              {envelope.validations.length ? (
                envelope.validations.map((row: any) => (
                  <div key={row.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-[11px]">
                    <p className="font-medium text-[var(--color-text-primary)]">{row.status ?? "validation"}</p>
                    <p className="mt-1 text-[var(--color-text-secondary)]">{row.message ?? "Validation recorded."}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-dashed border-[var(--color-border)] px-3 py-4 text-[12px] text-[var(--color-text-tertiary)]">
                  No validation results are available yet.
                </p>
              )}
            </div>
          </section>

          <section className="surface-card p-4">
            <p className="dense-label">Version history</p>
            <div className="mt-3 space-y-2">
              {envelope.versions.length ? (
                envelope.versions.map((row: any) => (
                  <div key={row.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-[11px]">
                    <p className="font-medium text-[var(--color-text-primary)]">Version {row.version}</p>
                    <p className="mt-1 text-[var(--color-text-secondary)]">{row.file_name ?? envelope.document.file_name}</p>
                    <p className="mt-1 text-[var(--color-text-tertiary)]">{formatDateTimeIST(row.created_at)}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-dashed border-[var(--color-border)] px-3 py-4 text-[12px] text-[var(--color-text-tertiary)]">
                  Current evidence is the only visible version.
                </p>
              )}
            </div>
          </section>

          <section className="surface-card p-4">
            <p className="dense-label">Review action bar</p>
            <div className="mt-3 space-y-3">
              {allowedActions.length ? (
                allowedActions.map((item) => (
                  <form key={item.action} action={submitDocumentTransitionAction} className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                    <input type="hidden" name="project_id" value={projectId} />
                    <input type="hidden" name="document_id" value={envelope.document.id} />
                    <input type="hidden" name="target_state" value={item.target} />
                    <input type="hidden" name="manual_submit" value="true" />
                    {item.target === "CLARIFICATION" || item.target === "REJECTED" ? (
                      <Textarea name="reason" required className="min-h-[72px]" placeholder="Reason is mandatory for rejection or clarification." />
                    ) : null}
                    <Button type="submit" className="h-[32px] w-full rounded-md px-3 text-[12px]">
                      {item.label}
                    </Button>
                  </form>
                ))
              ) : (
                <p className="rounded-md border border-dashed border-[var(--color-border)] px-3 py-4 text-[12px] text-[var(--color-text-tertiary)]">
                  No workflow action is currently allowed by backend state.
                </p>
              )}
            </div>
          </section>

          <section className="surface-card p-4">
            <p className="dense-label">AI assistance panel</p>
            <p className="mt-2 text-[12px] leading-5 text-[var(--color-text-secondary)]">
              Use Copilot to summarize this evidence against the project guidebook. Copilot may recommend next steps, but validation and workflow actions remain controlled by the backend.
            </p>
          </section>
        </aside>
      </div>
    </Shell>
  );
}
