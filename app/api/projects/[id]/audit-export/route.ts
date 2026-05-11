import { NextResponse } from "next/server";
import { auditService } from "@/lib/services/audit-service";
import { getProjectWorkspaceForApi } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { logSystemActivity } from "@/lib/services/activity-service";
import { canReviewProjectDocuments } from "@/lib/rbac";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const throttled = checkRateLimit(request, {
    key: "api:project:audit-export",
    limit: 10,
    windowMs: 60_000,
  });
  if (throttled) return throttled;

  const workspace = await getProjectWorkspaceForApi(id);
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canReviewProjectDocuments(workspace.userRole)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const buffer = await auditService.generateAuditExport(id);

  // Audit the audit export
  const admin = createAdminClient();
  await logSystemActivity(admin, {
    projectId: id,
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
