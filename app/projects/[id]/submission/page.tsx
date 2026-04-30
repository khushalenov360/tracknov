import Link from "next/link";
import { Download, FolderTree } from "lucide-react";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getSubmissionWorkspace } from "@/lib/data";
import { getApprovedSubmissionCredits, isSubmissionExportReady } from "@/lib/exports";

export const dynamic = "force-dynamic";

export default async function SubmissionPage({ params }: { params: { id: string } }) {
  const workspace = await getSubmissionWorkspace(params.id);
  if (!workspace) {
    return (
      <Shell title="Project Not Found" description="The requested project could not be found." role="consultant" notificationCount={0}>
        <div className="surface-card p-8 text-center">
          <p className="text-[14px] text-[var(--color-text-secondary)]">Project not found or you do not have access.</p>
          <Link href="/dashboard"><Button variant="secondary" className="mt-4">Back to Dashboard</Button></Link>
        </div>
      </Shell>
    );
  }

  const mandatoryReady = isSubmissionExportReady(workspace);
  const exportCredits = getApprovedSubmissionCredits(workspace);

  return (
    <Shell
      title={`${workspace.project.name} Submission`}
      description="This view shows what is ready to send and what still needs attention before export."
      role={workspace.userRole}
      notificationCount={workspace.notifications.length}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-3">
          {exportCredits.map((credit) => (
            <Card key={credit.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
                    {credit.credit_code}
                  </h3>
                  <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{credit.credit_name}</p>
                </div>
                <Badge className="border border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[var(--color-green)]">
                  Included
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {credit.documents
                  .filter((document) => document.status === "approved")
                  .map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-[11px]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--color-text-primary)]">
                          {document.file_name}
                        </p>
                        <p className="mt-1 text-[var(--color-text-tertiary)]">{document.doc_category}</p>
                      </div>
                      <Badge className="border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
                        {document.file_type}
                      </Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
                <FolderTree className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-[13px] font-medium text-[var(--color-text-primary)]">Submission pack</h3>
                <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                  Approved files are exported into folders that mirror the checklist structure.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {exportCredits.length === 0 ? (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-[11px] text-[var(--color-text-secondary)]">
                No completed credits are available for this rating system yet.
              </div>
            ) : null}
            <div
              className={`rounded-lg border p-3 text-[11px] ${
                mandatoryReady
                  ? "border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[var(--color-green)]"
                  : "border-[var(--color-amber-light)] bg-[var(--color-amber-light)] text-[var(--color-amber)]"
              }`}
            >
              {mandatoryReady
                ? "All must-complete items are finished. The export is ready."
                : "Some must-complete items are still pending, so export stays disabled for now."}
            </div>
            <Button asChild className="h-8 w-full rounded-md" variant={mandatoryReady ? "default" : "secondary"}>
              <Link
                aria-disabled={!mandatoryReady}
                href={mandatoryReady ? `/api/projects/${params.id}/submission-pack` : "#"}
                className={!mandatoryReady ? "pointer-events-none opacity-60" : ""}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download final package
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
