import { NextResponse } from "next/server";
import { getProjectWorkspaceForApi } from "@/lib/data";
import { buildProjectSummaryPdf } from "@/lib/exports";
import { logSystemActivity } from "@/lib/services/activity-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { canExportProjectArtifacts } from "@/lib/rbac";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const throttled = checkRateLimit(request, {
    key: "api:project:summary-export",
    limit: 12,
    windowMs: 60_000,
  });
  if (throttled) return throttled;

  const workspace = await getProjectWorkspaceForApi(id);
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canExportProjectArtifacts(workspace.userRole)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Audit Log
  const admin = createAdminClient();
  await logSystemActivity(admin, {
    projectId: id,
    entityType: "project",
    action: "export_summary_pdf",
    summary: `Exported project summary PDF for ${workspace.project.name}`,
  });

  const buffer = await buildProjectSummaryPdf(workspace);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${workspace.project.name}-summary.pdf"`,
    },
  });
}
