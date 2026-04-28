import { NextResponse } from "next/server";
import { getProjectWorkspaceForApi } from "@/lib/data";
import { buildSubmissionZip, isSubmissionExportReady } from "@/lib/exports";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const workspace = await getProjectWorkspaceForApi(params.id);
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
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
