import { NextResponse } from "next/server";
import { getProjectWorkspaceForApi } from "@/lib/data";
import { buildProjectSummaryPdf } from "@/lib/exports";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const workspace = await getProjectWorkspaceForApi(params.id);
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const buffer = await buildProjectSummaryPdf(workspace);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${workspace.project.name}-summary.pdf"`,
    },
  });
}
