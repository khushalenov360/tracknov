import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getProjectWorkspaceForApi } from "@/lib/data";
import { buildTrackerWorkbook } from "@/lib/exports";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const workspace = await getProjectWorkspaceForApi(params.id);
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const workbook = buildTrackerWorkbook(workspace);
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${workspace.project.name}-tracker.xlsx"`,
    },
  });
}
