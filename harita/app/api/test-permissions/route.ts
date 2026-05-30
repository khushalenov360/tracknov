
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isL5Role } from "@/lib/rbac";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") || "b73d7310-df16-4d26-b6c8-61bebb197410";
  
  const client = createClient();
  const { data: { user } } = await client.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 401 });
  }

  const { data: profile } = await client
    .from("profiles")
    .select("global_role")
    .eq("user_id", user.id)
    .maybeSingle();
  const role = String(
    profile?.global_role ?? user.user_metadata?.role ?? user.app_metadata?.role ?? "",
  ).toLowerCase();
  if (!isL5Role(role as any)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 1. Check if user exists in project_users
  const { data: membership } = await client
    .from("project_users")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  // 2. Check if user can select from projects
  const { data: project, error: projectError } = await client
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .maybeSingle();

  // 3. Directly test the security function via RPC if possible, or just raw query
  const { data: isMember, error: rpcError } = await client
    .rpc('is_project_member', { project: projectId });

  return NextResponse.json({
    user: user.email,
    uid: user.id,
    projectId,
    membershipInTable: membership ? "YES" : "NO",
    projectSelectResult: project ? "SUCCESS" : "FAILED",
    projectError: projectError?.message || "none",
    isMemberFunctionResult: isMember,
    rpcError: rpcError?.message || "none"
  });
}
