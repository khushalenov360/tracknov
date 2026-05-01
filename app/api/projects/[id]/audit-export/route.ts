import { NextResponse } from "next/server";
import { auditService } from "@/lib/services/audit-service";
import { getProjectWorkspaceForApi } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { logSystemActivity } from "@/lib/services/activity-service";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const workspace = await getProjectWorkspaceForApi(params.id);
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const buffer = await auditService.generateAuditExport(params.id);

  // Audit the audit export
  const admin = createAdminClient();
  await logSystemActivity(admin, {
    projectId: params.id,
    entityType: "project",
    action: "export_audit",
    summary: `Exported audit trail for ${workspace.project.name}`,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${workspace.project.name}-audit-trail.xlsx"`,
    },
  });
}
