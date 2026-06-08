import { NextResponse } from "next/server";
import { getProjectWorkspaceForApi } from "@/lib/data";
import { computeIgbcScore } from "@/lib/harita-engine/services/igbc-scoring-service";
import { createClient } from "@/lib/supabase/server";
import { runtimeGovernanceService } from "@/lib/harita-engine/services/runtime-governance-service";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await getProjectWorkspaceForApi(id);
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const hasDesync = await runtimeGovernanceService.hasOpenDesync(id);
  if (hasDesync) {
    return NextResponse.json(
      {
        source: "db",
        certification_state: "BLOCKED",
        certification_level: "Blocked",
        reason: "STATE_DESYNC pending reconciliation",
      },
      { status: 409 },
    );
  }

  const supabase = createClient();
  const { data: dbScore, error } = await supabase.rpc("get_project_certification_summary", {
    p_project_id: id,
  });

  if (!error && dbScore) {
    return NextResponse.json({
      source: "db",
      ...dbScore,
    });
  }

  await runtimeGovernanceService.raiseAlert({
    projectId: id,
    alertType: "certification_consistency_fallback",
    severity: "warning",
    message: "DB scoring RPC unavailable; service fallback used.",
    context: { rpcError: error?.message ?? "unknown" },
  });

  const score = computeIgbcScore(workspace);
  return NextResponse.json({
    source: "service_fallback",
    ...score,
  });
}
