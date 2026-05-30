import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data";
import type { WorkflowState } from "@tracknov/harita-engine/services/document-state-service";
import { runRuntimeTransition } from "@/core/runtime/orchestrator";

export const dynamic = "force-dynamic";

const allowedStates = new Set<WorkflowState>([
  "ASSIGNED",
  "IN_PROGRESS",
  "MAPPED",
  "L1_REVIEW",
  "L1_REJECTED",
  "READY_FOR_L3",
  "UNDER_L3_REVIEW",
  "CLARIFICATION",
  "APPROVED",
  "REJECTED",
  "REVOKED",
]);

function failure(status: string, message: string, httpStatus = 400) {
  return NextResponse.json(
    {
      ok: false,
      status,
      message,
      allowed_actions: [],
      lock_state: { locked: false, reason: null },
    },
    { status: httpStatus },
  );
}

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return failure("invalid_payload", "Request body must be valid JSON.");
  }

  const entityType = String(body?.entity_type ?? body?.entityType ?? "").trim();
  const entityId = String(body?.entity_id ?? body?.entityId ?? "").trim();
  const targetState = String(body?.target_state ?? body?.targetState ?? "").trim().toUpperCase() as WorkflowState;
  const projectId = body?.project_id ?? body?.projectId ?? null;

  if (!entityType || !entityId || !targetState) {
    return failure("invalid_payload", "entity_type, entity_id, and target_state are required.");
  }

  if (entityType !== "document" && entityType !== "submittal") {
    return failure("invalid_payload", "entity_type must be document or submittal.");
  }

  if (!allowedStates.has(targetState)) {
    return failure("invalid_payload", `Unsupported workflow state: ${targetState}.`);
  }

  const user = await getCurrentUser();
  const result = await runRuntimeTransition(user, {
    entityType,
    entityId,
    projectId,
    targetState,
    action: typeof body?.action === "string" ? body.action : null,
    reason: typeof body?.reason === "string" ? body.reason : null,
    metadata: typeof body?.metadata === "object" && body.metadata ? body.metadata : {},
    override: Boolean(body?.override),
    overrideReason: typeof body?.override_reason === "string"
      ? body.override_reason
      : typeof body?.overrideReason === "string"
        ? body.overrideReason
        : null,
  });

  if (!result.success) {
    const status =
      result.status === "authentication_failed" ? 401 :
      result.status === "authorization_failed" ? 403 :
      result.status === "not_found" ? 404 :
      result.status === "conflict" ? 409 :
      400;
    return NextResponse.json(
      {
        ok: false,
        message: result.errors?.join(", ") || "Transition failed",
        ...result,
      },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
