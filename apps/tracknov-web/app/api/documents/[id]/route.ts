import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@tracknov/harita-engine/security/rate-limit";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: Context) {
  const throttled = checkRateLimit(request, {
    key: "api:documents:signed-download",
    limit: 60,
    windowMs: 60_000,
  });
  if (throttled) return throttled;

  const { id } = await context.params;
  const client = createClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await client
    .from("profiles")
    .select("global_role")
    .eq("user_id", user.id)
    .maybeSingle();

  const isSuperUser =
    profile?.global_role === "super_user" || user.user_metadata?.role === "super_user" || user.user_metadata?.role === "superuser";

  const reader = isSuperUser ? createAdminClient() : client;
  const { data: document } = await reader
    .from("project_document")
    .select("id, project_id, file_path")
    .eq("id", id)
    .maybeSingle();

  if (!document?.file_path) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  if (!isSuperUser) {
    const { data: membership } = await client
      .from("project_users")
      .select("id")
      .eq("project_id", document.project_id)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from("project-documents")
    .createSignedUrl(document.file_path, 60 * 10);

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Could not open document." }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
