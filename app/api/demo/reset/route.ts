import { NextResponse } from "next/server";
import { demoService } from "@/lib/services/demo-service";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Security Gate: Only demo user can reset demo data
    if (user.email !== "demo@enov360.com") {
      return NextResponse.json({ error: "Restricted to Demo Account" }, { status: 403 });
    }

    const newProjectId = await demoService.resetDemo(user.id);

    return NextResponse.json({ success: true, projectId: newProjectId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
