import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data";
import { haritaRuntimeService } from "@/lib/harita-engine/services/harita-runtime-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, force } = body;
    if (!projectId) {
      return new Response("Missing projectId", { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Attempt to reset the session (this will summarize first unless force is true, then wipe history/memory)
    await haritaRuntimeService.resetSession(user.id, projectId, force);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[ResetEndpoint] Error resetting session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset session." },
      { status: 500 }
    );
  }
}
