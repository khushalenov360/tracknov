import { NextResponse } from "next/server";
import { getProjectWorkspaceForApi } from "@/lib/data";
import { buildSubmissionZip, isSubmissionExportReady } from "@/lib/exports";
import { logSystemActivity } from "@tracknov/harita-engine/services/activity-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { canExportProjectArtifacts } from "@/lib/rbac";
import { checkRateLimit } from "@tracknov/harita-engine/security/rate-limit";
import { runtimeGovernanceService } from "@tracknov/harita-engine/services/runtime-governance-service";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const throttled = checkRateLimit(request, {
    key: "api:project:submission-pack",
    limit: 10,
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

  const hasDesync = await runtimeGovernanceService.hasOpenDesync(id);
  if (hasDesync) {
    return NextResponse.json(
      { error: "Submission pack is blocked due to STATE_DESYNC. Run reconciliation first." },
      { status: 409 },
    );
  }

  // Audit Log
  const admin = createAdminClient();
  await logSystemActivity(admin, {
    projectId: id,
    entityType: "project",
    action: "export_submission_pack",
    summary: `Exported final submission ZIP pack for ${workspace.project.name}`,
  });

  const mandatoryReady = isSubmissionExportReady(workspace);

  if (!mandatoryReady) {
    return NextResponse.json(
      { error: "Finish all must-complete items before downloading the final package." },
      { status: 400 },
    );
  }

  const zip = await buildSubmissionZip(workspace);
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${workspace.project.name}-submission-pack.zip"`,
    },
  });
}
