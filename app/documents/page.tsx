import Link from "next/link";
import { FileText, Search } from "lucide-react";
import { GeneralUploadDocumentForm } from "@/components/project/general-upload-document-form";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { documentStatuses } from "@/lib/constants";
import { getDashboardProjects, getDocumentLibrary, getDocumentUploadOptions } from "@/lib/data";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams?: { project?: string; status?: string; search?: string };
}) {
  const [projects, documents, uploadProjects] = await Promise.all([
    getDashboardProjects(),
    getDocumentLibrary(searchParams),
    getDocumentUploadOptions(),
  ]);

  return (
    <Shell
      title="Document Library"
      description="Unified ENOVAIT document hub for project files, IGBC evidence, validation status, and upload history."
      role={projects[0]?.role ?? "consultant"}
      notificationCount={projects.reduce((sum, project) => sum + project.openRemarks, 0)}
    >
      <GeneralUploadDocumentForm
        projects={uploadProjects}
      />

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

      <section className="mt-4 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-[12px]">
            <thead className="bg-[var(--color-surface-2)]">
              <tr className="border-b border-[var(--color-border)]">
                {["Document", "Project", "Credit", "Uploaded", "Status", "Notes"].map((heading) => (
                  <th key={heading} className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => {
                const status = documentStatuses[document.status];
                return (
                  <tr key={document.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)]">
                    <td className="px-3 py-3">
                      <div className="flex min-w-[220px] items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
                            {document.file_name}
                          </p>
                          <p className="mt-0.5 text-[10px] uppercase text-[var(--color-text-tertiary)]">
                            {document.file_type} / {document.doc_category}
                          </p>
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
                      {new Date(document.uploaded_at).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-3 py-3">
                      <Badge className={status.className}>{status.enovaitLabel}</Badge>
                    </td>
                    <td className="max-w-[260px] truncate px-3 py-3 text-[11px] text-[var(--color-text-secondary)]">
                      {document.notes || document.rejection_reason || "No notes"}
                    </td>
                  </tr>
                );
              })}
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-[12px] text-[var(--color-text-tertiary)]">
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
