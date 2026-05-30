import { NextResponse } from "next/server";
import { projectService } from "@tracknov/harita-engine/services/project-service";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@tracknov/harita-engine/security/rate-limit";

export async function POST(req: Request) {
  const throttled = checkRateLimit(req, {
    key: "api:project:join",
    limit: 15,
    windowMs: 60_000,
  });
  if (throttled) return throttled;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectCode } = await req.json();
    if (!projectCode) return NextResponse.json({ error: "Project code required" }, { status: 400 });

    const currentUser = { id: user.id, email: user.email!, role: (user.app_metadata.role as any) || "consultant" };
    const project = await projectService.joinProjectByCode(currentUser, projectCode);

    return NextResponse.json({ success: true, projectId: project.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
