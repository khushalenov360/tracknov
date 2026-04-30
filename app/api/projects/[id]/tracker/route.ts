import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getProjectWorkspaceForApi } from "@/lib/data";
import { buildTrackerWorkbook } from "@/lib/exports";
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
    action: "export_tracker",
    summary: `Exported document tracker for ${workspace.project.name}`,
  });

  const workbook = buildTrackerWorkbook(workspace);
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${workspace.project.name}-tracker.xlsx"`,
    },
  });
}
