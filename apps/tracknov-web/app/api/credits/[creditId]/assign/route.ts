import { NextResponse } from "next/server";
import { assignmentService } from "@/lib/assignment/assignmentService";
import { executeAction } from "@/core/runtime/executionContext";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ creditId: string }> }
) {
  try {
    const { creditId } = await params;
    const body = await request.json();
    const { assigneeId } = body;

    if (!assigneeId) {
      return NextResponse.json({ success: false, error: "assigneeId required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const result = await executeAction(
      {
        actorId: user?.id || "SYSTEM",
        projectId: "TODO_FETCH_PROJECT_ID", // Normally fetched from credit context
        entityType: "credit",
        entityId: creditId,
        action: "assign",
      },
      "assign_task",
      async (admin) => {
        const { data: credit } = await admin
          .from("project_credits")
          .select("project_id")
          .eq("id", creditId)
          .single();

        if (!credit) return { success: false, errors: ["Credit not found"] };

        const assignment = await assignmentService.assignTask({
          projectId: credit.project_id,
          projectCreditId: creditId,
          documentType: "ASSIGNED_WORK",
          assigneeRole: "consultant", // Real implementation would determine this dynamically
          assigneeUserId: assigneeId,
          actorId: user?.id,
        });

        return {
          success: true,
          data: assignment,
        };
      }
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      creditId,
      assigneeId,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
