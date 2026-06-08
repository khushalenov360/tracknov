import { NextResponse } from "next/server";
import { clientService } from "@/lib/harita-engine/services/client-service";
import { getProjectWorkspaceForApi } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { logSystemActivity } from "@/lib/harita-engine/services/activity-service";
import { canAccessBillingAndInvoice } from "@/lib/rbac";
import { checkRateLimit } from "@/lib/harita-engine/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const throttled = checkRateLimit(request, {
    key: "api:project:client-report",
    limit: 10,
    windowMs: 60_000,
  });
  if (throttled) return throttled;

  const workspace = await getProjectWorkspaceForApi(id);
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canAccessBillingAndInvoice(workspace.userRole)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const buffer = await clientService.generateClientStatusReport(id);

  // Audit Log
  const admin = createAdminClient();
  await logSystemActivity(admin, {
    projectId: id,
    entityType: "project",
    action: "export_client_report",
    summary: `Exported client status report for ${workspace.project.name}`,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${workspace.project.name}-client-report.xlsx"`,
    },
  });
}
