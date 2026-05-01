import { NextResponse } from "next/server";
import { getProjectWorkspaceForApi } from "@/lib/data";
import { computeIgbcScore } from "@/lib/services/igbc-scoring-service";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const workspace = await getProjectWorkspaceForApi(params.id);
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const score = computeIgbcScore(workspace);
  return NextResponse.json(score);
}
