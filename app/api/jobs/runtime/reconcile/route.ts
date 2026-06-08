import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data";
import { runtimeGovernanceService } from "@/lib/harita-engine/services/runtime-governance-service";
import { checkRateLimit } from "@/lib/harita-engine/security/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const throttled = checkRateLimit(request, {
    key: "api:jobs:runtime-reconcile",
    limit: 10,
    windowMs: 60_000,
  });
  if (throttled) return throttled;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!["super_user", "super_admin"].includes(user.role)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const payload = await request.json().catch(() => ({}));
  const limit = Math.max(1, Math.min(Number(payload?.limit ?? 25), 100));
  const result = await runtimeGovernanceService.runReconciliationBatch(limit);
  return NextResponse.json({ success: true, ...result });
}
