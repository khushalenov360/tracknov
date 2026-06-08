import { NextResponse } from "next/server";
import { memberService } from "@/lib/harita-engine/services/member-service";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/harita-engine/security/rate-limit";

export async function POST(req: Request) {
  const throttled = checkRateLimit(req, {
    key: "api:project:invite",
    limit: 20,
    windowMs: 60_000,
  });
  if (throttled) return throttled;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId, email, role, fullName, company } = await req.json();
    if (!projectId || !email || !role) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const currentUser = { id: user.id, email: user.email!, role: (user.app_metadata.role as any) || "consultant" };
    
    // Using createMember for now as it handles provisioning + project assignment
    await memberService.createMember(currentUser, {
      fullName: fullName || email.split("@")[0],
      email,
      company: company || "Unknown",
      role,
      projectId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
