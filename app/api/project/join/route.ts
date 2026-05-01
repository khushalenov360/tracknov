import { NextResponse } from "next/server";
import { projectService } from "@/lib/services/project-service";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
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
