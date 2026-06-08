import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data";
import { env } from "@/lib/env";
import { checkRateLimit } from "@/lib/harita-engine/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const throttled = checkRateLimit(request, {
    key: "api:credits",
    limit: 120,
    windowMs: 60_000,
  });
  if (throttled) return throttled;

  if (!env.isConfigured) {
    return NextResponse.json({ ok: false, error: "Workspace credentials are not configured." }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id")?.trim();
  if (!projectId) {
    return NextResponse.json({ ok: false, error: "project_id is required." }, { status: 400 });
  }

  const client = createClient();
  const { data, error } = await client
    .from("project_credits")
    .select("id, project_id, credit_code, credit_name, category, is_mandatory, state, documentation_summary, what_to_submit")
    .eq("project_id", projectId)
    .order("credit_code", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    project_id: projectId,
    credits: data ?? [],
  });
}
