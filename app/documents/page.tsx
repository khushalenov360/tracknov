import Link from "next/link";
import { FileText, Search } from "lucide-react";
import { deleteDocumentAction, resubmitDocumentAction, setDocumentStatusAction, updateDocumentMetadataAction } from "@/app/actions";
import { GeneralUploadDocumentForm } from "@/components/project/general-upload-document-form";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { documentStatuses } from "@/lib/constants";
import { getDashboardProjects, getDocumentLibrary, getDocumentUploadOptions } from "@/lib/data";
import { formatDateTimeIST } from "@/lib/utils";

import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams?: { project?: string; status?: string; search?: string; document?: string };
}) {
  cookies(); // Explicitly call cookies to force dynamic behavior
  const [projects, documents, uploadProjects] = await Promise.all([
    getDashboardProjects(),
    getDocumentLibrary(searchParams),
    getDocumentUploadOptions(),
  ]);
  const projectOptionsById = new Map(uploadProjects.map((project) => [project.id, project]));
  const activeRole = projects[0]?.role ?? "consultant";
  const clientMode = activeRole === "client";
  const roleScopedSummary =
    activeRole === "architect" || activeRole === "mep" || activeRole === "contractor"
      ? (() => {
          const total = documents.length;
          const completed = documents.filter((document) => document.status === "approved").length;
          const rejected = documents.filter((document) => document.status === "rejected").length;
          const incomplete = Math.max(total - completed - rejected, 0);
          return { total, completed, rejected, incomplete };
        })()
      : null;
  const focusedDocumentId = (searchParams?.document ?? "").trim();
  const focusedRejectedDocument = focusedDocumentId
    ? documents.find((document) => document.id === focusedDocumentId && document.status === "rejected")
    : null;

  return (
    <Shell
      title="Document Library"
      description="Unified ENOVAIT document hub for project files, IGBC evidence, validation status, and upload history."
      role={projects[0]?.role ?? "consultant"}
      notificationCount={projects.reduce((sum, project) => sum + project.openRemarks, 0)}
    >
      {uploadProjects.length ? (
        <div id="upload-zone">
          <GeneralUploadDocumentForm projects={uploadProjects} />
        </div>
      ) : (
        <section className="surface-card p-4">
          <h2 className="text-[13px] font-medium text-[var(--color-text-primary)]">No project access</h2>
          <p className="mt-2 text-[12px] text-[var(--color-text-secondary)]">
            You need at least one assigned project before uploading documents to the shared library.
          </p>
        </section>
      )}
      {roleScopedSummary ? (
        <section className="mt-4 surface-card p-4">
          <h2 className="text-[13px] font-medium text-[var(--color-text-primary)]">My scope readiness</h2>
          <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
            Assigned uploads in your role scope across current project access.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <p className="dense-label">Assigned docs</p>
              <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{roleScopedSummary.total}</p>
            </div>
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <p className="dense-label">Completed</p>
              <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{roleScopedSummary.completed}</p>
            </div>
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <p className="dense-label">Incomplete</p>
              <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{roleScopedSummary.incomplete}</p>
            </div>
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <p className="dense-label">Rejected</p>
              <p className="mono mt-1 text-[16px] text-[var(--color-text-primary)]">{roleScopedSummary.rejected}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-4 surface-card p-4">
        <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              name="search"
              defaultValue={searchParams?.search ?? ""}
              placeholder="Search documents, projects, credits, notes"
              className="h-[34px] w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] pl-9 pr-3 text-[13px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-border-strong)]"
            />
          </div>
          <select
            name="status"
            defaultValue={searchParams?.status ?? ""}
            className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
          >
            <option value="">All statuses</option>
            {Object.entries(documentStatuses).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <select
            name="project"
            defaultValue={searchParams?.project ?? ""}
            className="h-[34px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
          >
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <Button type="submit" className="h-[34px] rounded-md px-4">
            Filter
          </Button>
        </form>
      </section>

      {!clientMode && focusedRejectedDocument ? (
        <section id="rejection-card" className="mt-4 rounded-md border border-[var(--color-amber)] bg-[var(--color-amber-soft)] p-4">
          <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Action needed: rejected document</h2>
          <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
            <strong>{focusedRejectedDocument.file_name}</strong> for{" "}
            <strong>{focusedRejectedDocument.credit_code ?? "Credit mapping required"}</strong> was sent back.
          </p>
          <p className="mt-2 text-[12px] text-[var(--color-text-secondary)]">
            <strong>Fix requested:</strong>{" "}
            {focusedRejectedDocument.rejection_reason || "Reviewer comment was not provided."}
          </p>
          {focusedRejectedDocument.credit_what_to_submit ? (
            <p className="mt-2 text-[12px] text-[var(--color-text-secondary)]">
              <strong>What to submit:</strong> {focusedRejectedDocument.credit_what_to_submit}
            </p>
          ) : null}
          {focusedRejectedDocument.credit_sample_document_url ? (
            <p className="mt-2 text-[12px]">
              <a
                href={focusedRejectedDocument.credit_sample_document_url}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-green)] hover:text-[var(--color-green-dim)]"
              >
                Open sample reference document
              </a>
            </p>
          ) : null}
          <p className="mt-3 text-[12px]">
            <a
              href={`#doc-${focusedRejectedDocument.id}`}
              className="text-[var(--color-green)] hover:text-[var(--color-green-dim)]"
            >
              Open this document row and resubmit
            </a>
          </p>
        </section>
      ) : null}

      <section className="mt-4 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-[12px]">
            <thead className="bg-[var(--color-surface-2)]">
              <tr className="border-b border-[var(--color-border)]">
                {["Document", "Project", "Credit", "Uploaded", "Status", "Notes", "Actions"].map((heading) => (
                  <th key={heading} className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => {
                const status = documentStatuses[document.status];
                const projectOptions = projectOptionsById.get(document.project_id);
                const creditOptions = projectOptions?.credits ?? [];
                const selectedCredit =
                  creditOptions.find((credit) => credit.id === document.credit_id) ?? creditOptions[0];
                const docTypeOptions = selectedCredit?.doc_types.length
                  ? selectedCredit.doc_types
                  : Array.from(new Set(creditOptions.flatMap((credit) => credit.doc_types)));
                const canOpen = Boolean(document.file_path);
                return (
                  <tr
                    id={`doc-${document.id}`}
                    key={document.id}
                    className={`border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)] ${
                      focusedDocumentId === document.id ? "bg-[var(--color-blue-soft)]" : ""
                    }`}
                  >
                    <td className="px-3 py-3">
                      <div className="flex min-w-[220px] items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          {canOpen && !clientMode ? (
                            <a
                              href={`/api/documents/${document.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="block truncate text-[13px] font-medium text-[var(--color-green)] hover:text-[var(--color-green-dim)]"
                            >
                              {document.file_name}
                            </a>
                          ) : (
                            <p className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
                              {document.file_name}
                            </p>
                          )}
                          <p className="mt-0.5 text-[10px] uppercase text-[var(--color-text-tertiary)]">
                            {document.file_type} / {document.doc_category}
                          </p>
                          {document.uploaded_by_name ? (
                            <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                              Uploaded by {document.uploaded_by_name}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[var(--color-text-secondary)]">{document.project_name}</td>
                    <td className="px-3 py-3">
                      {document.credit_code ? (
                        <Link href={`/projects/${document.project_id}?credit=${document.credit_id}`} className="text-[var(--color-green)] hover:text-[var(--color-green-dim)]">
                          {document.credit_code}
                        </Link>
                      ) : <span className="text-[var(--color-text-tertiary)]">Credit mapping required</span>}
                    </td>
                    <td className="px-3 py-3 text-[var(--color-text-secondary)]">
                      {formatDateTimeIST(document.uploaded_at)}
                    </td>
                    <td className="px-3 py-3">
                      <Badge className={status.className}>{status.enovaitLabel}</Badge>
                    </td>
                    <td className="max-w-[260px] truncate px-3 py-3 text-[11px] text-[var(--color-text-secondary)]">
                      {clientMode ? "Restricted in client mode" : document.notes || document.rejection_reason || "No notes"}
                    </td>
                    <td className="px-3 py-3 align-top">
                      {!clientMode && (document.can_edit_metadata || document.can_edit_status || document.can_reject || document.can_delete) ? (
                        <details className="min-w-[260px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                          <summary className="cursor-pointer list-none text-[12px] font-medium text-[var(--color-text-primary)]">
                            Edit document
                          </summary>
                          <div className="mt-3 space-y-3">
                            {document.can_edit_metadata ? (
                              <form action={updateDocumentMetadataAction} className="space-y-2">
                                <input type="hidden" name="document_id" value={document.id} />
                                <input type="hidden" name="project_id" value={document.project_id} />
                                <label className="block text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                                  Credit mapping
                                </label>
                                <select
                                  name="credit_id"
                                  defaultValue={document.credit_id ?? selectedCredit?.id ?? ""}
                                  className="h-[34px] w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none"
                                >
                                  {creditOptions.map((credit) => (
                                    <option key={credit.id} value={credit.id}>
                                      {credit.credit_code} - {credit.credit_name}
                                    </option>
                                  ))}
                                </select>
                                <label className="block text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                                  Document type
                                </label>
                                <select
                                  name="doc_category"
                                  defaultValue={document.doc_category}
                                  className="h-[34px] w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none"
                                >
                                  {docTypeOptions.map((docType) => (
                                    <option key={docType} value={docType}>
                                      {docType}
                                    </option>
                                  ))}
                                </select>
                                <label className="block text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                                  Notes
                                </label>
                                <textarea
                                  name="notes"
                                  defaultValue={document.notes ?? ""}
                                  rows={3}
                                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] text-[var(--color-text-primary)] outline-none"
                                />
                                <Button type="submit" className="h-[32px] rounded-md px-3 text-[12px]">
                                  Save mapping
                                </Button>
                              </form>
                            ) : null}

                            {document.can_edit_status || document.can_reject ? (
                              <form action={setDocumentStatusAction} className="space-y-2 border-t border-[var(--color-border)] pt-3">
                                <input type="hidden" name="document_id" value={document.id} />
                                <input type="hidden" name="project_id" value={document.project_id} />
                                <input type="hidden" name="credit_id" value={document.credit_id ?? ""} />
                                <label className="block text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                                  Review status
                                </label>
                                <select
                                  name="status"
                                  defaultValue={document.status}
                                  className="h-[34px] w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none"
                                >
                                  {document.can_edit_status ? (
                                    <>
                                      <option value="uploaded">Pending Project Owner Review</option>
                                      <option value="owner_approved">Pending Project Admin Review</option>
                                      <option value="approved">Approved For Submission</option>
                                    </>
                                  ) : null}
                                  {(document.can_reject || document.can_edit_status) ? (
                                    <option value="rejected">Rejected / Excluded</option>
                                  ) : null}
                                </select>
                                <select
                                  name="rejection_type"
                                  defaultValue=""
                                  className="h-[34px] w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)] outline-none"
                                >
                                  <option value="">Reject reason type (required for rejection)</option>
                                  <option value="missing_data">Missing required information</option>
                                  <option value="incorrect_format">Incorrect format</option>
                                  <option value="wrong_document">Wrong document type</option>
                                  <option value="poor_quality">Poor image quality / unreadable</option>
                                  <option value="outdated_document">Outdated document</option>
                                  <option value="wrong_credit_mapping">Wrong credit mapping</option>
                                </select>
                                <textarea
                                  name="rejection_remark"
                                  placeholder="Specific reason and correction step (minimum 20 characters)"
                                  rows={3}
                                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] text-[var(--color-text-primary)] outline-none"
                                />
                                <Button type="submit" variant="secondary" className="h-[32px] rounded-md px-3 text-[12px]">
                                  Update status
                                </Button>
                              </form>
                            ) : null}

                            {document.can_delete ? (
                              <form action={deleteDocumentAction} className="border-t border-[var(--color-border)] pt-3">
                                <input type="hidden" name="document_id" value={document.id} />
                                <input type="hidden" name="project_id" value={document.project_id} />
                                <Button type="submit" variant="danger" className="h-[32px] rounded-md px-3 text-[12px]">
                                  Delete document
                                </Button>
                              </form>
                            ) : null}

                            {document.status === "rejected" && document.can_edit_metadata ? (
                              <form action={resubmitDocumentAction} className="space-y-2 border-t border-[var(--color-border)] pt-3">
                                <input type="hidden" name="document_id" value={document.id} />
                                <input type="hidden" name="project_id" value={document.project_id} />
                                <label className="block text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                                  Resubmit for owner review
                                </label>
                                <textarea
                                  name="resubmit_note"
                                  placeholder="What changed in this resubmission?"
                                  rows={2}
                                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] text-[var(--color-text-primary)] outline-none"
                                />
                                <Button type="submit" variant="secondary" className="h-[32px] rounded-md px-3 text-[12px]">
                                  Resubmit document
                                </Button>
                              </form>
                            ) : null}

                            {document.can_view_logs ? (
                              <section className="border-t border-[var(--color-border)] pt-3">
                                <p className="text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                                  Upload/change log (IST)
                                </p>
                                <div className="mt-2 space-y-2">
                                  {document.activity_logs?.length ? (
                                    document.activity_logs.slice(0, 8).map((log) => (
                                      <div key={log.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2">
                                        <p className="text-[11px] text-[var(--color-text-primary)]">{log.summary}</p>
                                        <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                                          {formatDateTimeIST(log.created_at)} / {log.actor_name ?? log.actor_role ?? "System"}
                                        </p>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-[11px] text-[var(--color-text-tertiary)]">
                                      No audit entries yet for this document.
                                    </p>
                                  )}
                                </div>
                              </section>
                            ) : null}
                          </div>
                        </details>
                      ) : (
                        <span className="text-[11px] text-[var(--color-text-tertiary)]">View only</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-[12px] text-[var(--color-text-tertiary)]">
                    No documents match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}
