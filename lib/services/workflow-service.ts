import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordDocumentReviewEvent } from "@/lib/services/review-service";
import { canEditDocumentStatusAtAnyStage } from "@/lib/rbac";
import {
  canTransitionDocument,
  getTransitionPayload,
  getTransitionSideEffects,
  RawDocumentStatus,
} from "@/lib/workflow/state-machine";

type SupabaseClient = ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>;

export async function notifyUsers(
  writer: SupabaseClient,
  {
    projectId,
    creditId,
    documentId,
    userIds,
    body,
  }: {
    projectId: string;
    creditId?: string | null;
    documentId?: string | null;
    userIds: string[];
    body: string;
  },
) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueUserIds.length || !body.trim()) {
    return;
  }
  await writer.from("notifications").insert(
    uniqueUserIds.map((userId) => ({
      project_id: projectId,
      credit_id: creditId ?? null,
      document_id: documentId ?? null,
      user_id: userId,
      body,
    })),
  );
}

export async function getProjectMembersByRoles(
  writer: SupabaseClient,
  projectId: string,
  roles: string[],
) {
  const { data } = await writer
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId)
    .in("role", roles);
  return (data ?? []).map((row: any) => row.user_id).filter(Boolean) as string[];
}

export async function logDocumentActivity(
  writer: SupabaseClient,
  {
    documentId,
    projectId,
    action,
    actorId,
    actorRole,
    summary,
    details = {},
  }: {
    documentId?: string | null;
    projectId: string;
    action: "uploaded" | "metadata_updated" | "status_updated" | "deleted";
    actorId?: string | null;
    actorRole?: string | null;
    summary: string;
    details?: Record<string, unknown>;
  },
) {
  await writer.from("document_activity_logs").insert({
    document_id: documentId ?? null,
    project_id: projectId,
    action,
    actor_id: actorId ?? null,
    actor_role: actorRole ?? null,
    summary,
    details,
  });
}

export async function executeDocumentTransition(params: {
  writer: SupabaseClient;
  client: ReturnType<typeof createClient>;
  documentId: string;
  projectId: string;
  creditId: string;
  currentStatus: string;
  targetStatus: RawDocumentStatus;
  actorId: string;
  actorRole: string;
  rejectionRemark?: string;
  rejectionType?: string;
}) {
  const {
    writer,
    client,
    documentId,
    projectId,
    creditId,
    currentStatus,
    targetStatus,
    actorId,
    actorRole,
    rejectionRemark,
    rejectionType,
  } = params;

  const role = String(actorRole);
  const isOwner = role === "owner" || role === "super_user";
  const isAdmin = role === "project_admin" || role === "super_admin" || role === "super_user";
  const canStatusEditAtAnyStage = canEditDocumentStatusAtAnyStage(role as any);

  // 1. Validation
  const transitionAllowed = canTransitionDocument({
    fromStatus: currentStatus,
    toStatus: targetStatus,
    actorRole,
    allowOverride: canStatusEditAtAnyStage,
  });

  if (!transitionAllowed) {
    return { error: "Invalid state transition" };
  }

  // 2. Format remarks
  const formattedRemark = rejectionType && rejectionRemark
    ? `[${rejectionType}] ${rejectionRemark}`
    : rejectionRemark || "";

  // 3. Database Update Payload
  const payload = getTransitionPayload(targetStatus, actorId, isOwner, isAdmin, formattedRemark);

  const { error: updateError } = await writer
    .from("documents")
    .update(payload)
    .eq("id", documentId);

  if (updateError) {
    return { error: updateError.message };
  }

  // 4. Determine Side Effects
  const isOverride = canStatusEditAtAnyStage && !canTransitionDocument({
      fromStatus: currentStatus,
      toStatus: targetStatus,
      actorRole,
      allowOverride: false,
  });
  
  const sideEffects = getTransitionSideEffects(targetStatus, isOwner, isAdmin, isOverride);

  // Log Activity
  await logDocumentActivity(writer, {
    documentId,
    projectId,
    action: "status_updated",
    actorId,
    actorRole,
    summary: sideEffects.logSummary,
    details: { 
      from_status: currentStatus, 
      to_status: targetStatus, 
      ...(sideEffects.requiresRemark ? { rejection_type: rejectionType || null, rejection_remark: formattedRemark } : {}) 
    },
  });

  // Remediation 04: Approved Document Set Authority
  if (targetStatus === "APPROVED") {
    // 1. Get or Create Active Set
    const { data: activeSet } = await writer.from("approved_document_sets").select("id").eq("project_id", projectId).eq("status", "ACTIVE").maybeSingle();
    let setId = activeSet?.id;
    if (!setId) {
      const { data: newSet } = await writer.from("approved_document_sets").insert({ project_id: projectId, status: "ACTIVE" }).select("id").single();
      setId = newSet?.id;
    }
    if (setId) {
      await writer.from("approved_document_set_items").upsert({
        set_id: setId,
        document_id: documentId,
        project_credit_id: creditId,
      }, { onConflict: "set_id,document_id" });
    }
  } else if (currentStatus === "APPROVED" && targetStatus !== "APPROVED") {
    // If transitioning OUT of approved (e.g. revoked), remove it
    await writer.from("approved_document_set_items").delete().eq("document_id", documentId);
  }

  // Record Review Event
  await recordDocumentReviewEvent({
    documentId,
    projectId,
    reviewerId: actorId,
    reviewerRole: actorRole,
    action: sideEffects.reviewEventAction,
    statusAfter: targetStatus,
    remarks: sideEffects.requiresRemark ? formattedRemark : null,
  });

  // Insert Remarks if needed
  if (sideEffects.requiresRemark && formattedRemark) {
    await client.from("remarks").insert({
      credit_id: creditId,
      document_id: documentId,
      author_id: actorId,
      role: actorRole,
      body: formattedRemark,
    });
  }

  // Dispatch Notifications
  if (sideEffects.notificationType) {
    if (sideEffects.notificationType === "admin_review_ready") {
      const projectAdminIds = await getProjectMembersByRoles(writer, projectId, ["project_admin", "super_admin"]);
      await notifyUsers(writer, {
        projectId,
        creditId,
        documentId,
        userIds: projectAdminIds,
        body: "A document is ready for Project Admin review.",
      });
    } else if (sideEffects.notificationType === "uploader_approved" || sideEffects.notificationType === "uploader_rejected") {
      const uploaderRecord = await client
        .from("documents")
        .select("uploaded_by")
        .eq("id", documentId)
        .maybeSingle();
      
      const uploaderId = uploaderRecord.data?.uploaded_by;
      if (uploaderId) {
        const body = sideEffects.notificationType === "uploader_approved" 
          ? "Your document was approved for submission pack inclusion." 
          : `Document sent back: ${formattedRemark}`;
          
        await notifyUsers(writer, {
          projectId,
          creditId,
          documentId,
          userIds: [uploaderId],
          body,
        });
      }
    }
  }

  return { success: true };
}
