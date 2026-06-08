import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data";
import { env } from "@/lib/env";
import { checkRateLimit } from "@/lib/harita-engine/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const throttled = checkRateLimit(request, {
    key: "api:validation:submittal",
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
  const submittalId = searchParams.get("submittal_id")?.trim();
  const documentId = searchParams.get("document_id")?.trim();
  if (!projectId || (!submittalId && !documentId)) {
    return NextResponse.json(
      { ok: false, error: "project_id and either submittal_id or document_id are required." },
      { status: 400 },
    );
  }

  const client = createClient();
  const documentQuery = client
    .from("project_document")
    .select("id, project_id, submittal_id, state, file_name")
    .eq("project_id", projectId)
    .limit(20);
  const { data: documents, error: documentError } = documentId
    ? await documentQuery.eq("id", documentId)
    : await documentQuery.eq("submittal_id", submittalId);

  if (documentError) {
    return NextResponse.json({ ok: false, error: documentError.message }, { status: 400 });
  }

  const documentIds = (documents ?? []).map((row: any) => row.id);
  const { data: validationResults, error: validationError } = documentIds.length
    ? await client
        .from("validation_results")
        .select("id, entity_id, rule_id, status, message, created_at")
        .in("entity_id", documentIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (validationError) {
    return NextResponse.json({ ok: false, error: validationError.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    project_id: projectId,
    submittal_id: submittalId ?? null,
    document_id: documentId ?? null,
    documents: documents ?? [],
    validation_results: validationResults ?? [],
  });
}
