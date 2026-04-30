import { NextResponse } from "next/server";
import { getProjectWorkspaceForApi } from "@/lib/data";
import { buildProjectSummaryPdf } from "@/lib/exports";
import { logSystemActivity } from "@/lib/services/activity-service";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const workspace = await getProjectWorkspaceForApi(params.id);
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Audit Log
  const admin = createAdminClient();
  await logSystemActivity(admin, {
    projectId: params.id,
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
