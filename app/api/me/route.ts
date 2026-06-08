import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch profile to get name and resolved role
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, global_role")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    id: user.id,
    name: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "there",
    role: profile?.global_role || user.user_metadata?.role || "consultant",
  });
}
