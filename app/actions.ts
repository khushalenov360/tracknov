"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createProjectForCurrentUser,
  createProjectTopupInvoiceForCurrentUser,
  deleteProjectForCurrentUser,
  getCurrentUser,
  getOrCreateOnboardingChecklist,
  getProjectWorkspace,
  logConsultantSessionForCurrentUser,
  updateOnboardingChecklistForCurrentUser,
  updateProjectBillingSettingsForCurrentUser,
  updateProjectForCurrentUser,
} from "@/lib/data";
import { env } from "@/lib/env";
import {
  canCreateProjects,
  canDeleteProjects,
  canEditDocumentStatusAtAnyStage,
  canEditOwnDocumentBeforeFinalApproval,
  canUploadProjectDocuments,
} from "@/lib/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function pathFor(projectId: string) {
  return [`/dashboard`, `/projects/${projectId}`, `/projects/${projectId}/submission`];
}

export type TeamMemberActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const uploadAllowedExtensions = [".pdf", ".docx", ".png", ".jpg", ".jpeg"] as const;
const uploadMaxBytes = 10 * 1024 * 1024;
const rejectionTemplateLibrary: Record<string, string> = {
  missing_data: "Missing required information. Please resubmit with all mandatory values clearly visible.",
  incorrect_format: "Document format is incorrect for this requirement. Upload the required format with readable structure.",
  wrong_document: "Wrong document type for this credit. Please upload the exact required evidence for this credit slot.",
  poor_quality: "Document image/scan quality is unclear. Please upload a readable, high-clarity file.",
  outdated_document: "Document is outdated for current review cycle. Please upload the latest valid certificate/record.",
  wrong_credit_mapping: "Document is mapped to the wrong credit. Please remap and resubmit under the correct credit requirement.",
};

async function notifyUsers(
  writer: ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>,
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

async function getProjectMembersByRoles(
  writer: ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>,
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

async function getActorProjectRole(projectId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  if (user.role === "super_user") {
    return "super_user";
  }

  const client = createClient();
  const { data: membership } = await client
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return membership?.role ?? user.role;
}

async function getClientUserForProject(writer: ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>, projectId: string) {
  const { data } = await writer
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId)
    .eq("role", "client")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function logDocumentActivity(
  writer: ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>,
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

async function logSystemActivity(
  writer: ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>,
  {
    projectId,
    entityType,
    entityId,
    action,
    actorId,
    actorRole,
    summary,
    details = {},
  }: {
    projectId?: string | null;
    entityType: "project" | "credit" | "document" | "team" | "billing" | "auth";
    entityId?: string | null;
    action: string;
    actorId?: string | null;
    actorRole?: string | null;
    summary: string;
    details?: Record<string, unknown>;
  },
) {
  await writer.from("system_activity_logs").insert({
    project_id: projectId ?? null,
    entity_type: entityType,
    entity_id: entityId ?? null,
    action,
    actor_id: actorId ?? null,
    actor_role: actorRole ?? null,
    summary,
    details,
  });
}

export async function createProjectAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const clientName = String(formData.get("client") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const ratingSystem = String(formData.get("rating_system") ?? "").trim();
  const projectType = String(formData.get("project_type") ?? "commercial");
  const status = String(formData.get("status") ?? "active");
  const greenCertification = String(formData.get("green_certification") ?? "IGBC");
  const igbcVariant = String(formData.get("igbc_variant") ?? "new");
  const targetRating = String(formData.get("target_rating") ?? "Certified");
  const user = await getCurrentUser();
  if (!canCreateProjects(user?.role)) {
    return;
  }
  if (!name || !clientName || !location || !ratingSystem) {
    return;
  }

  const project = await createProjectForCurrentUser({
    name,
    ratingSystem,
    targetRating,
    clientName,
    location,
    projectType,
    status,
    greenCertification,
    igbcVariant,
  });
  const writer = env.supabaseServiceRoleKey ? createAdminClient() : createClient();
  await logSystemActivity(writer, {
    projectId: project.id,
    entityType: "project",
    entityId: project.id,
    action: "created",
    actorId: user?.id ?? null,
    actorRole: user?.role ?? null,
    summary: `Created project ${name}.`,
    details: { name, client: clientName, location, rating_system: ratingSystem },
  });
  pathFor(project.id).forEach((path) => revalidatePath(path));
  revalidatePath("/projects");
  revalidatePath("/documents");
  revalidatePath("/credits");
  redirect(`/projects/${project.id}`);
}

export async function updateProjectAction(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const clientName = String(formData.get("client") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const ratingSystem = String(formData.get("rating_system") ?? "").trim();
  const status = String(formData.get("status") ?? "active").trim();

  if (!projectId || !name || !clientName || !location || !ratingSystem) {
    return;
  }

  await updateProjectForCurrentUser({
    projectId,
    name,
    clientName,
    location,
    ratingSystem,
    status,
  });
  const user = await getCurrentUser();
  const writer = env.supabaseServiceRoleKey ? createAdminClient() : createClient();
  await logSystemActivity(writer, {
    projectId,
    entityType: "project",
    entityId: projectId,
    action: "updated",
    actorId: user?.id ?? null,
    actorRole: user?.role ?? null,
    summary: `Updated project profile.`,
    details: { name, client: clientName, location, rating_system: ratingSystem, status },
  });

  pathFor(projectId).forEach((path) => revalidatePath(path));
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/documents");
  revalidatePath("/credits");
}

export async function updateProjectPlanSettingsAction(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "").trim();
  const planCode = String(formData.get("plan_code") ?? "starter").trim();
  const documentCreditLimit = Number(formData.get("document_credit_limit") ?? 0);
  const consultantCreditLimit = Number(formData.get("consultant_credit_limit") ?? 0);
  const topupDocumentCredits = Number(formData.get("topup_document_credits") ?? 0);
  const topupConsultantCredits = Number(formData.get("topup_consultant_credits") ?? 0);

  if (!projectId || !planCode) {
    return;
  }

  await updateProjectBillingSettingsForCurrentUser({
    projectId,
    planCode,
    documentCreditLimit,
    consultantCreditLimit,
    topupDocumentCredits,
    topupConsultantCredits,
  });
  const user = await getCurrentUser();
  const writer = env.supabaseServiceRoleKey ? createAdminClient() : createClient();
  await logSystemActivity(writer, {
    projectId,
    entityType: "billing",
    entityId: projectId,
    action: "plan_updated",
    actorId: user?.id ?? null,
    actorRole: user?.role ?? null,
    summary: "Updated project billing plan settings.",
    details: {
      plan_code: planCode,
      document_credit_limit: documentCreditLimit,
      consultant_credit_limit: consultantCreditLimit,
      topup_document_credits: topupDocumentCredits,
      topup_consultant_credits: topupConsultantCredits,
    },
  });

  pathFor(projectId).forEach((path) => revalidatePath(path));
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/documents");
}

export async function logConsultantSessionAction(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "").trim();
  const source = String(formData.get("source") ?? "manual").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const creditsBurned = Number(formData.get("credits_burned") ?? 1);

  if (!projectId) {
    return;
  }

  const writer = env.supabaseServiceRoleKey ? createAdminClient() : createClient();
  const currentUser = await getCurrentUser();
  const clientUserId = await getClientUserForProject(writer, projectId);
  if (!clientUserId) {
    return;
  }
  try {
    const { error: tokenError } = await writer.rpc("consume_client_tokens", {
      p_client_user_id: clientUserId,
      p_project_id: projectId,
      p_tokens: Math.max(1, Math.trunc(creditsBurned || 1)) * 50,
      p_reason: "Consulting session token burn",
      p_actor_id: currentUser?.id ?? null,
      p_meta: { source, notes, hours: Math.max(1, Math.trunc(creditsBurned || 1)) },
    });
    if (tokenError) {
      return;
    }
    await logConsultantSessionForCurrentUser({
      projectId,
      source,
      notes,
      creditsBurned,
    });
  } catch {
    return;
  }
  const user = currentUser;
  await logSystemActivity(writer, {
    projectId,
    entityType: "billing",
    entityId: projectId,
    action: "consultant_session_logged",
    actorId: user?.id ?? null,
    actorRole: user?.role ?? null,
    summary: "Logged consultant interaction session.",
    details: { source, credits_burned: creditsBurned, notes },
  });

  pathFor(projectId).forEach((path) => revalidatePath(path));
  revalidatePath("/projects");
  revalidatePath("/dashboard");
}

export async function createProjectTopupInvoiceAction(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "").trim();
  const documentCredits = Number(formData.get("document_credits") ?? 0);
  const consultantCredits = Number(formData.get("consultant_credits") ?? 0);
  const amountInr = Number(formData.get("amount_inr") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim();

  if (!projectId) {
    return;
  }

  try {
    await createProjectTopupInvoiceForCurrentUser({
      projectId,
      documentCredits,
      consultantCredits,
      amountInr,
      notes,
    });
  } catch {
    return;
  }
  const user = await getCurrentUser();
  const writer = env.supabaseServiceRoleKey ? createAdminClient() : createClient();
  await logSystemActivity(writer, {
    projectId,
    entityType: "billing",
    entityId: projectId,
    action: "topup_invoiced",
    actorId: user?.id ?? null,
    actorRole: user?.role ?? null,
    summary: "Created top-up invoice.",
    details: { document_credits: documentCredits, consultant_credits: consultantCredits, amount_inr: amountInr, notes },
  });

  pathFor(projectId).forEach((path) => revalidatePath(path));
  revalidatePath("/projects");
  revalidatePath("/dashboard");
}

export async function updateOnboardingChecklistAction(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "").trim();
  const key = String(formData.get("key") ?? "").trim();
  const value = String(formData.get("value") ?? "false").trim() === "true";

  if (!projectId) {
    return;
  }
  const allowedKeys = [
    "profile_completed",
    "project_scope_confirmed",
    "first_document_uploaded",
    "first_review_completed",
  ] as const;
  if (!allowedKeys.includes(key as any)) {
    return;
  }

  await getOrCreateOnboardingChecklist(projectId);
  await updateOnboardingChecklistForCurrentUser(projectId, key as any, value);
  revalidatePath("/dashboard");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/welcome");
}

export async function deleteProjectAction(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "").trim();
  const user = await getCurrentUser();
  if (!projectId || !canDeleteProjects(user?.role)) {
    return;
  }
  const writer = env.supabaseServiceRoleKey ? createAdminClient() : createClient();
  await logSystemActivity(writer, {
    projectId,
    entityType: "project",
    entityId: projectId,
    action: "deleted",
    actorId: user?.id ?? null,
    actorRole: user?.role ?? null,
    summary: "Deleted project.",
  });

  await deleteProjectForCurrentUser(projectId);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/documents");
  revalidatePath("/credits");
  redirect("/projects");
}

export async function addRemarkAction(formData: FormData) {
  if (!env.isConfigured) {
    return;
  }

  const client = createClient();
  const user = await getCurrentUser();
  if (!user) {
    return;
  }

  const projectId = String(formData.get("project_id"));
  const creditId = String(formData.get("credit_id"));
  const roleValue = String(formData.get("role") ?? "consultant");
  const role = ["super_user", "owner", "client", "consultant", "architect", "mep", "contractor", "project_admin", "super_admin"].includes(roleValue)
    ? roleValue
    : "consultant";
  const body = String(formData.get("body") ?? "").trim();
  if (!body) {
    return;
  }

  const { error } = await client.from("remarks").insert({
    credit_id: creditId,
    author_id: user.id,
    role,
    body,
  });

  if (error) {
    return;
  }

  pathFor(projectId).forEach((path) => revalidatePath(path));
}

export async function setDocumentStatusAction(formData: FormData) {
  if (!env.isConfigured) {
    return;
  }

  const client = createClient();
  const writer = env.supabaseServiceRoleKey ? createAdminClient() : client;
  const projectId = String(formData.get("project_id"));
  const documentId = String(formData.get("document_id"));
  const status = String(formData.get("status"));
  const rejectionRemark = String(formData.get("rejection_remark") ?? "").trim();
  const creditId = String(formData.get("credit_id"));
  const rejectionType = String(formData.get("rejection_type") ?? "").trim();
  const user = await getCurrentUser();
  const actorProjectRole = projectId ? await getActorProjectRole(projectId) : user?.role ?? null;
  const { data: currentDocument } = await client
    .from("documents")
    .select("id, status, project_id")
    .eq("id", documentId)
    .maybeSingle();

  const currentStatus = currentDocument?.status ?? "";
  const actorRole = actorProjectRole ?? user?.role ?? "consultant";
  const canOwnerReview = actorRole === "owner" || actorRole === "super_user";
  const canStatusEditAtAnyStage = canEditDocumentStatusAtAnyStage(actorRole as any);
  const canFinalReview = canStatusEditAtAnyStage;

  if (status === "owner_approved") {
    if ((!canOwnerReview && !canStatusEditAtAnyStage) || (!canStatusEditAtAnyStage && currentStatus !== "uploaded")) {
      return;
    }

    const { error } = await writer
      .from("documents")
      .update({
        status,
        rejection_reason: "",
        owner_reviewed_by: user?.id ?? null,
        owner_reviewed_at: new Date().toISOString(),
      })
      .eq("id", documentId);
    if (error) {
      return;
    }
    await logDocumentActivity(writer, {
      documentId,
      projectId,
      action: "status_updated",
      actorId: user?.id ?? null,
      actorRole,
      summary: `Moved document to Project Admin review.`,
      details: { from_status: currentStatus, to_status: status },
    });
    const projectAdminIds = await getProjectMembersByRoles(writer, projectId, ["project_admin", "super_admin"]);
    await notifyUsers(writer, {
      projectId,
      creditId: creditId || null,
      documentId,
      userIds: projectAdminIds,
      body: "A document is ready for Project Admin review.",
    });

    revalidatePath("/documents");
    pathFor(projectId).forEach((path) => revalidatePath(path));
    return;
  }

  if (status === "approved") {
    if (!canFinalReview || (!canStatusEditAtAnyStage && currentStatus !== "owner_approved")) {
      return;
    }

    const { error } = await writer
      .from("documents")
      .update({
        status,
        rejection_reason: "",
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", documentId);
    if (error) {
      return;
    }
    await logDocumentActivity(writer, {
      documentId,
      projectId,
      action: "status_updated",
      actorId: user?.id ?? null,
      actorRole,
      summary: `Approved document for submission pack.`,
      details: { from_status: currentStatus, to_status: status },
    });
    const uploaderRecord = await client
      .from("documents")
      .select("uploaded_by")
      .eq("id", documentId)
      .maybeSingle();
    const uploaderIds = uploaderRecord.data?.uploaded_by ? [uploaderRecord.data.uploaded_by] : [];
    await notifyUsers(writer, {
      projectId,
      creditId: creditId || null,
      documentId,
      userIds: uploaderIds,
      body: "Your document was approved for submission pack inclusion.",
    });

    revalidatePath("/documents");
    pathFor(projectId).forEach((path) => revalidatePath(path));
    return;
  }

  if (status !== "rejected") {
    if (!canStatusEditAtAnyStage) {
      return;
    }

    const { error } = await writer
      .from("documents")
      .update({
        status,
        rejection_reason: "",
        owner_reviewed_by: status === "uploaded" ? null : undefined,
        owner_reviewed_at: status === "uploaded" ? null : undefined,
        reviewed_by: status === "approved" ? user?.id ?? null : status === "uploaded" || status === "owner_approved" ? null : undefined,
        reviewed_at: status === "approved" ? new Date().toISOString() : status === "uploaded" || status === "owner_approved" ? null : undefined,
      })
      .eq("id", documentId);
    if (error) {
      return;
    }
    await logDocumentActivity(writer, {
      documentId,
      projectId,
      action: "status_updated",
      actorId: user?.id ?? null,
      actorRole,
      summary: `Updated review status.`,
      details: { from_status: currentStatus, to_status: status },
    });

    revalidatePath("/documents");
    pathFor(projectId).forEach((path) => revalidatePath(path));
    return;
  }

  if (!rejectionRemark || (!canOwnerReview && !canFinalReview)) {
    return;
  }
  if (rejectionRemark.length < 20 || !rejectionType) {
    return;
  }
  const formattedRemark = rejectionType
    ? `[${rejectionType}] ${rejectionRemark}`
    : rejectionRemark;

  const { error } = await writer
    .from("documents")
    .update({
      status,
      rejection_reason: formattedRemark,
      owner_reviewed_by: canOwnerReview ? user?.id ?? null : null,
      owner_reviewed_at: canOwnerReview ? new Date().toISOString() : null,
      reviewed_by: canFinalReview ? user?.id ?? null : null,
      reviewed_at: canFinalReview ? new Date().toISOString() : null,
    })
    .eq("id", documentId);
  if (error) {
    return;
  }
  await logDocumentActivity(writer, {
    documentId,
    projectId,
    action: "status_updated",
    actorId: user?.id ?? null,
    actorRole,
      summary: `Rejected document with review note.`,
      details: { from_status: currentStatus, to_status: status, rejection_type: rejectionType || null, rejection_remark: formattedRemark },
    });

  if (formattedRemark && user) {
    await client.from("remarks").insert({
      credit_id: creditId,
      document_id: documentId,
      author_id: user.id,
      role: actorRole,
      body: formattedRemark,
    });
  }
  const uploaderId = (
    await client
      .from("documents")
      .select("uploaded_by")
      .eq("id", documentId)
      .maybeSingle()
  ).data?.uploaded_by;
  await notifyUsers(writer, {
    projectId,
    creditId: creditId || null,
    documentId,
    userIds: uploaderId ? [uploaderId] : [],
    body: `Document sent back: ${formattedRemark}`,
  });
  revalidatePath("/documents");
  pathFor(projectId).forEach((path) => revalidatePath(path));
}

export async function bulkReviewDocumentsAction(formData: FormData) {
  if (!env.isConfigured) {
    return;
  }

  const action = String(formData.get("bulk_action") ?? "").trim();
  const rejectionType = String(formData.get("rejection_type") ?? "").trim();
  const remark = String(formData.get("rejection_remark") ?? "").trim();
  const documentIds = formData
    .getAll("document_ids")
    .map((value) => String(value))
    .filter(Boolean);
  if (!documentIds.length || !["approve", "reject"].includes(action)) {
    return;
  }

  const client = createClient();
  const writer = env.supabaseServiceRoleKey ? createAdminClient() : client;
  const user = await getCurrentUser();
  if (!user) {
    return;
  }

  for (const documentId of documentIds) {
    const { data: currentDocument } = await client
      .from("documents")
      .select("id, status, project_id, credit_id")
      .eq("id", documentId)
      .maybeSingle();
    if (!currentDocument) {
      continue;
    }
    const actorProjectRole = await getActorProjectRole(currentDocument.project_id);
    if (!actorProjectRole) {
      continue;
    }
    const canOwnerReview = actorProjectRole === "owner" || actorProjectRole === "super_user";
    const canFinalReview = ["project_admin", "super_admin", "super_user"].includes(actorProjectRole);

    if (action === "approve") {
      const nextStatus = canOwnerReview ? "owner_approved" : canFinalReview ? "approved" : null;
      if (!nextStatus) {
        continue;
      }
      if (canOwnerReview && currentDocument.status !== "uploaded") {
        continue;
      }
      if (canFinalReview && currentDocument.status !== "owner_approved") {
        continue;
      }
      const payload =
        nextStatus === "owner_approved"
          ? {
              status: "owner_approved",
              rejection_reason: "",
              owner_reviewed_by: user.id,
              owner_reviewed_at: new Date().toISOString(),
            }
          : {
              status: "approved",
              rejection_reason: "",
              reviewed_by: user.id,
              reviewed_at: new Date().toISOString(),
            };
      const { error } = await writer.from("documents").update(payload).eq("id", documentId);
      if (error) {
        continue;
      }
      await logDocumentActivity(writer, {
        documentId,
        projectId: currentDocument.project_id,
        action: "status_updated",
        actorId: user.id,
        actorRole: actorProjectRole,
        summary:
          nextStatus === "owner_approved"
            ? "Bulk-approved to Project Admin review."
            : "Bulk-approved for submission pack.",
        details: { to_status: nextStatus, bulk: true },
      });
      pathFor(currentDocument.project_id).forEach((path) => revalidatePath(path));
      continue;
    }

    const templateMessage = rejectionType ? rejectionTemplateLibrary[rejectionType] ?? "" : "";
    const baseMessage = remark || templateMessage;
    if (!baseMessage || baseMessage.length < 20 || !rejectionType) {
      continue;
    }
    if (!(canOwnerReview || canFinalReview)) {
      continue;
    }
    const formattedRemark = rejectionType
      ? `[${rejectionType}] ${baseMessage}`
      : baseMessage;
    const { error } = await writer
      .from("documents")
      .update({
        status: "rejected",
        rejection_reason: formattedRemark,
        owner_reviewed_by: canOwnerReview ? user.id : null,
        owner_reviewed_at: canOwnerReview ? new Date().toISOString() : null,
        reviewed_by: canFinalReview ? user.id : null,
        reviewed_at: canFinalReview ? new Date().toISOString() : null,
      })
      .eq("id", documentId);
    if (error) {
      continue;
    }
    await logDocumentActivity(writer, {
      documentId,
      projectId: currentDocument.project_id,
      action: "status_updated",
      actorId: user.id,
      actorRole: actorProjectRole,
      summary: "Bulk-rejected with review remark.",
      details: { to_status: "rejected", rejection_type: rejectionType || null, rejection_remark: formattedRemark, bulk: true },
    });
    if (currentDocument.credit_id) {
      await client.from("remarks").insert({
        credit_id: currentDocument.credit_id,
        document_id: documentId,
        author_id: user.id,
        role: actorProjectRole,
        body: formattedRemark,
      });
    }
    const uploaderRecord = await client
      .from("documents")
      .select("uploaded_by")
      .eq("id", documentId)
      .maybeSingle();
    await notifyUsers(writer, {
      projectId: currentDocument.project_id,
      creditId: currentDocument.credit_id ?? null,
      documentId,
      userIds: uploaderRecord.data?.uploaded_by ? [uploaderRecord.data.uploaded_by] : [],
      body: `Document sent back: ${formattedRemark}`,
    });
    pathFor(currentDocument.project_id).forEach((path) => revalidatePath(path));
  }

  revalidatePath("/dashboard");
  revalidatePath("/documents");
  revalidatePath("/review-queue");
}

export async function uploadDocumentAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!env.isConfigured) {
    return { ok: false, error: "Live workspace credentials are not configured yet." };
  }

  const projectId = String(formData.get("project_id") ?? "").trim();
  const creditId = String(formData.get("credit_id") ?? "").trim();
  const docCategory = String(formData.get("doc_category") ?? "").trim();
  const requirementSlot = String(formData.get("requirement_slot") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const file = formData.get("file");

  if (!projectId || !creditId || !docCategory || !(file instanceof File)) {
    return { ok: false, error: "Choose project, mapped credit, document type, and file." };
  }

  const fileNameLower = file.name.toLowerCase();
  const hasAllowedExtension = uploadAllowedExtensions.some((extension) => fileNameLower.endsWith(extension));
  if (!hasAllowedExtension) {
    return { ok: false, error: "Unsupported file type. Upload PDF, DOCX, PNG, or JPG files only." };
  }

  if (file.size > uploadMaxBytes) {
    return { ok: false, error: "File is too large. The limit is 10 MB. Compress and re-upload." };
  }

  const client = createClient();
  const writer = env.supabaseServiceRoleKey ? createAdminClient() : client;
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Your session expired. Sign in again." };
  }
  const actorProjectRole = await getActorProjectRole(projectId);
  if (!actorProjectRole || !canUploadProjectDocuments(actorProjectRole as any)) {
    return { ok: false, error: "You do not have upload access for this project." };
  }
  const clientUserId = await getClientUserForProject(writer, projectId);
  if (!clientUserId) {
    return { ok: false, error: "Client wallet is not linked for this project yet." };
  }
  const { data: usage } = await writer
    .from("project_usage_summary")
    .select("documents_used, document_credit_limit, topup_document_credits")
    .eq("project_id", projectId)
    .maybeSingle();
  const allowedDocuments =
    Number(usage?.document_credit_limit ?? 0) + Number(usage?.topup_document_credits ?? 0);
  const usedDocuments = Number(usage?.documents_used ?? 0);
  if (allowedDocuments > 0 && usedDocuments >= allowedDocuments) {
    return { ok: false, error: "Document credit limit reached for this project plan. Increase plan quota or add top-up credits." };
  }
  const { data: duplicate } = await writer
    .from("documents")
    .select("id, file_name, status")
    .eq("project_id", projectId)
    .eq("credit_id", creditId)
    .eq("doc_category", docCategory)
    .ilike("file_name", file.name)
    .in("status", ["uploaded", "owner_approved", "approved"])
    .limit(1)
    .maybeSingle();
  if (duplicate?.id) {
    return {
      ok: false,
      error: "Possible duplicate file already exists for this credit/doc type. Open existing document or rename before uploading.",
    };
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const safeDocType = docCategory.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const safeBaseName = baseName.replace(/[^a-z0-9_-]+/gi, "_").replace(/_+/g, "_").slice(0, 80) || "file";
  const filePath = `${projectId}/${creditId}/${safeDocType}/${crypto.randomUUID()}-${safeBaseName}.${extension}`;

  const { error: storageError } = await writer.storage.from("project-documents").upload(filePath, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (storageError) {
    return { ok: false, error: storageError.message };
  }

  const mergedNotes = [notes, requirementSlot ? `Requirement slot: ${requirementSlot}` : ""].filter(Boolean).join("\n");
  const { data: documentRow, error: dbError } = await writer
    .from("documents")
    .insert({
      project_id: projectId,
      credit_id: creditId,
      uploaded_by: user.id,
      file_name: file.name,
      file_path: filePath,
      file_type: extension,
      doc_category: docCategory,
      notes: mergedNotes,
      status: "uploaded",
    })
    .select("id")
    .single();
  if (dbError || !documentRow) {
    await writer.storage.from("project-documents").remove([filePath]);
    return { ok: false, error: dbError?.message ?? "Upload record could not be saved." };
  }

  const { error: tokenError } = await writer.rpc("consume_client_tokens", {
    p_client_user_id: clientUserId,
    p_project_id: projectId,
    p_tokens: 1,
    p_reason: "Document upload token burn",
    p_actor_id: user.id,
    p_meta: { file_name: file.name, doc_category: docCategory, credit_id: creditId, document_id: documentRow.id },
  });
  if (tokenError) {
    await writer.from("documents").delete().eq("id", documentRow.id);
    await writer.storage.from("project-documents").remove([filePath]);
    return { ok: false, error: "Insufficient client tokens. Ask Project Admin to load more tokens." };
  }

  await logDocumentActivity(writer, {
    documentId: documentRow.id,
    projectId,
    action: "uploaded",
    actorId: user.id,
    actorRole: actorProjectRole,
    summary: `Uploaded ${file.name} under ${docCategory}.`,
    details: {
      file_name: file.name,
      doc_category: docCategory,
      credit_id: creditId,
      file_type: extension,
      bytes: file.size,
      requirement_slot: requirementSlot || null,
    },
  });
  const ownerIds = await getProjectMembersByRoles(writer, projectId, ["owner"]);
  await notifyUsers(writer, {
    projectId,
    creditId,
    documentId: documentRow.id,
    userIds: ownerIds,
    body: `New upload received for owner review: ${file.name}`,
  });

  revalidatePath("/documents");
  pathFor(projectId).forEach((path) => revalidatePath(path));
  return { ok: true };
}

export async function loadClientTokensAction(formData: FormData) {
  const clientUserId = String(formData.get("client_user_id") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const tokens = Number(formData.get("tokens") ?? 0);
  const reason = String(formData.get("reason") ?? "Project Admin top-up").trim();
  if (!clientUserId || !projectId || !tokens || tokens <= 0) {
    return;
  }
  const actor = await getCurrentUser();
  const role = await getActorProjectRole(projectId);
  if (!(role === "project_admin" || role === "super_admin" || role === "super_user")) {
    return;
  }
  const writer = env.supabaseServiceRoleKey ? createAdminClient() : createClient();
  const { error } = await writer.rpc("credit_client_tokens", {
    p_client_user_id: clientUserId,
    p_project_id: projectId,
    p_tokens: Math.trunc(tokens),
    p_reason: reason || "Project Admin top-up",
    p_actor_id: actor?.id ?? null,
    p_meta: { loaded_by_role: role },
  });
  if (error) {
    return;
  }
  await logSystemActivity(writer, {
    projectId,
    entityType: "billing",
    entityId: clientUserId,
    action: "client_tokens_loaded",
    actorId: actor?.id ?? null,
    actorRole: role,
    summary: `Loaded ${Math.trunc(tokens)} tokens to client wallet.`,
    details: { client_user_id: clientUserId, reason },
  });
  revalidatePath("/team");
  revalidatePath("/projects");
  revalidatePath("/documents");
}

export async function updateDocumentMetadataAction(formData: FormData) {
  if (!env.isConfigured) {
    return;
  }

  const documentId = String(formData.get("document_id") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const creditId = String(formData.get("credit_id") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const docCategory = String(formData.get("doc_category") ?? "").trim();

  if (!documentId || !projectId || !creditId || !docCategory) {
    return;
  }

  const client = createClient();
  const writer = env.supabaseServiceRoleKey ? createAdminClient() : client;
  const user = await getCurrentUser();
  if (!user) {
    return;
  }

  const actorProjectRole = await getActorProjectRole(projectId);
  if (!actorProjectRole) {
    return;
  }

  const { data: document } = await client
    .from("documents")
    .select("id, uploaded_by, status, project_id, credit_id, doc_category, notes")
    .eq("id", documentId)
    .maybeSingle();

  if (!document || document.project_id !== projectId) {
    return;
  }

  const canAdminEdit = canEditDocumentStatusAtAnyStage(actorProjectRole as any);
  const canOwnEdit =
    document.uploaded_by === user.id &&
    document.status !== "approved" &&
    canEditOwnDocumentBeforeFinalApproval(actorProjectRole as any);

  if (!canAdminEdit && !canOwnEdit) {
    return;
  }

  const { data: credit } = await client
    .from("credits")
    .select("id, project_id, documents_required")
    .eq("id", creditId)
    .maybeSingle();

  if (!credit || credit.project_id !== projectId) {
    return;
  }

  const allowedTypes = Array.from(
    new Set(
      ((credit.documents_required ?? []) as Array<{ type?: string; required?: boolean }>)
        .filter((item) => item.type)
        .map((item) => item.type as string),
    ),
  );

  if (allowedTypes.length && !allowedTypes.includes(docCategory)) {
    return;
  }

  const { error } = await writer
    .from("documents")
    .update({
      credit_id: creditId,
      doc_category: docCategory,
      notes,
    })
    .eq("id", documentId);

  if (error) {
    return;
  }
  await logDocumentActivity(writer, {
    documentId,
    projectId,
    action: "metadata_updated",
    actorId: user.id,
    actorRole: actorProjectRole,
    summary: "Updated document mapping details.",
    details: {
      from_credit_id: document.credit_id,
      to_credit_id: creditId,
      from_doc_category: document.doc_category,
      to_doc_category: docCategory,
      from_notes: document.notes ?? "",
      to_notes: notes,
    },
  });

  revalidatePath("/documents");
  pathFor(projectId).forEach((path) => revalidatePath(path));
}

export async function deleteDocumentAction(formData: FormData) {
  if (!env.isConfigured) {
    return;
  }

  const documentId = String(formData.get("document_id") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  if (!documentId || !projectId) {
    return;
  }

  const client = createClient();
  const writer = env.supabaseServiceRoleKey ? createAdminClient() : client;
  const user = await getCurrentUser();
  if (!user) {
    return;
  }

  const actorProjectRole = await getActorProjectRole(projectId);
  if (!actorProjectRole) {
    return;
  }

  const { data: existing } = await client
    .from("documents")
    .select("id, project_id, file_name, status, credit_id, doc_category, uploaded_by")
    .eq("id", documentId)
    .maybeSingle();

  if (!existing || existing.project_id !== projectId) {
    return;
  }

  const canAdminDelete =
    actorProjectRole === "super_user" || actorProjectRole === "super_admin" || actorProjectRole === "project_admin";
  const canOwnWithdrawUnreviewed =
    existing.uploaded_by === user.id &&
    existing.status === "uploaded" &&
    canEditOwnDocumentBeforeFinalApproval(actorProjectRole as any);

  if (!canAdminDelete && !canOwnWithdrawUnreviewed) {
    return;
  }

  if (canOwnWithdrawUnreviewed) {
    const clientUserId = await getClientUserForProject(writer, projectId);
    if (clientUserId) {
      await writer.rpc("credit_client_tokens", {
        p_client_user_id: clientUserId,
        p_project_id: projectId,
        p_tokens: 1,
        p_reason: "Token refund for unreviewed document delete",
        p_actor_id: user.id,
        p_meta: { document_id: existing.id, file_name: existing.file_name },
      });
    }
  }

  await logDocumentActivity(writer, {
    documentId,
    projectId,
    action: "deleted",
    actorId: user.id,
    actorRole: actorProjectRole,
    summary: `Deleted document ${existing.file_name}.`,
    details: {
      file_name: existing.file_name,
      status: existing.status,
      credit_id: existing.credit_id,
      doc_category: existing.doc_category,
      refund_applied: canOwnWithdrawUnreviewed,
    },
  });

  const { error } = await writer.from("documents").delete().eq("id", documentId);
  if (error) {
    return;
  }

  revalidatePath("/documents");
  pathFor(projectId).forEach((path) => revalidatePath(path));
}

export async function resubmitDocumentAction(formData: FormData) {
  if (!env.isConfigured) {
    return;
  }

  const documentId = String(formData.get("document_id") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const resubmitNote = String(formData.get("resubmit_note") ?? "").trim();
  if (!documentId || !projectId) {
    return;
  }

  const client = createClient();
  const writer = env.supabaseServiceRoleKey ? createAdminClient() : client;
  const user = await getCurrentUser();
  if (!user) {
    return;
  }

  const actorProjectRole = await getActorProjectRole(projectId);
  if (!actorProjectRole) {
    return;
  }

  const { data: documentRow } = await client
    .from("documents")
    .select("id, uploaded_by, status, project_id, credit_id, notes, rejection_reason")
    .eq("id", documentId)
    .maybeSingle();

  if (!documentRow || documentRow.project_id !== projectId || documentRow.status !== "rejected") {
    return;
  }

  const canAdminEdit = canEditDocumentStatusAtAnyStage(actorProjectRole as any);
  const canOwnEdit =
    documentRow.uploaded_by === user.id &&
    canEditOwnDocumentBeforeFinalApproval(actorProjectRole as any);

  if (!canAdminEdit && !canOwnEdit) {
    return;
  }

  const nextNotes = [documentRow.notes ?? "", resubmitNote ? `Resubmission note: ${resubmitNote}` : ""]
    .filter(Boolean)
    .join("\n\n");

  const { error } = await writer
    .from("documents")
    .update({
      status: "uploaded",
      notes: nextNotes,
      rejection_reason: "",
      owner_reviewed_by: null,
      owner_reviewed_at: null,
      reviewed_by: null,
      reviewed_at: null,
    })
    .eq("id", documentId);

  if (error) {
    return;
  }

  await logDocumentActivity(writer, {
    documentId,
    projectId,
    action: "status_updated",
    actorId: user.id,
    actorRole: actorProjectRole,
    summary: "Resubmitted document for Project Owner review.",
    details: {
      from_status: "rejected",
      to_status: "uploaded",
      previous_rejection_reason: documentRow.rejection_reason ?? "",
      resubmit_note: resubmitNote,
    },
  });
  const ownerIds = await getProjectMembersByRoles(writer, projectId, ["owner"]);
  await notifyUsers(writer, {
    projectId,
    creditId: documentRow.credit_id ?? null,
    documentId,
    userIds: ownerIds,
    body: "A rejected document has been resubmitted and is ready for owner review.",
  });

  revalidatePath("/documents");
  pathFor(projectId).forEach((path) => revalidatePath(path));
}

export async function setCreditStateAction(formData: FormData) {
  if (!env.isConfigured) {
    return;
  }

  const client = createClient();
  const projectId = String(formData.get("project_id"));
  const creditId = String(formData.get("credit_id"));
  const action = String(formData.get("action"));
  const writer = env.supabaseServiceRoleKey ? createAdminClient() : client;
  const user = await getCurrentUser();

  if (action === "complete") {
    const workspace = await getProjectWorkspace(projectId);
    const credit = workspace.credits.find((item) => item.id === creditId);
    if (!credit || credit.documents_required.some((doc) => doc.required && !credit.documents.some((file) => file.doc_category === doc.type && file.status === "approved"))) {
      return;
    }
    const { error } = await client
      .from("credits")
      .update({ status: "complete", blocked_by: null })
      .eq("id", creditId);
    if (error) {
      return;
    }
    await logSystemActivity(writer, {
      projectId,
      entityType: "credit",
      entityId: creditId,
      action: "status_complete",
      actorId: user?.id ?? null,
      actorRole: user?.role ?? null,
      summary: "Marked credit as complete.",
    });
  }

  if (action === "blocked") {
    const blockedBy = String(formData.get("blocked_by") ?? "consultant");
    const { error } = await client
      .from("credits")
      .update({ status: "blocked", blocked_by: blockedBy })
      .eq("id", creditId);
    if (error) {
      return;
    }
    await logSystemActivity(writer, {
      projectId,
      entityType: "credit",
      entityId: creditId,
      action: "status_blocked",
      actorId: user?.id ?? null,
      actorRole: user?.role ?? null,
      summary: "Marked credit as blocked.",
      details: { blocked_by: blockedBy },
    });
  }

  pathFor(projectId).forEach((path) => revalidatePath(path));
}

export async function updateCreditDocumentRequirementsAction(formData: FormData) {
  if (!env.isConfigured) {
    return;
  }

  const projectId = String(formData.get("project_id") ?? "").trim();
  const creditId = String(formData.get("credit_id") ?? "").trim();
  if (!projectId || !creditId) {
    return;
  }

  const actorRole = await getActorProjectRole(projectId);
  if (!(actorRole === "project_admin" || actorRole === "super_user")) {
    return;
  }

  const selectedTypes = new Set(
    formData
      .getAll("required_doc_types")
      .map((value) => String(value))
      .filter(Boolean),
  );

  const client = createClient();
  const writer = env.supabaseServiceRoleKey ? createAdminClient() : client;
  const { data: credit } = await client
    .from("credits")
    .select("id, project_id, documents_required")
    .eq("id", creditId)
    .maybeSingle();

  if (!credit || credit.project_id !== projectId) {
    return;
  }

  const nextRequirements = ((credit.documents_required ?? []) as Array<{ type: string; label: string }>).map((item) => {
    const required = selectedTypes.has(item.type);
    return {
      ...item,
      required,
      requirement: required ? "Required" : "NA",
    };
  });

  const { error } = await writer
    .from("credits")
    .update({
      documents_required: nextRequirements,
    })
    .eq("id", creditId);

  if (error) {
    return;
  }
  const user = await getCurrentUser();
  await logSystemActivity(writer, {
    projectId,
    entityType: "credit",
    entityId: creditId,
    action: "requirements_updated",
    actorId: user?.id ?? null,
    actorRole: actorRole,
    summary: "Updated required document types for credit.",
    details: { required_types: Array.from(selectedTypes) },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/documents");
}

export async function updateCreditGuidanceAction(formData: FormData) {
  if (!env.isConfigured) {
    return;
  }

  const projectId = String(formData.get("project_id") ?? "").trim();
  const creditId = String(formData.get("credit_id") ?? "").trim();
  const whatToSubmit = String(formData.get("what_to_submit") ?? "").trim();
  const effortLevel = String(formData.get("effort_level") ?? "moderate").trim();
  const effortGuidance = String(formData.get("effort_guidance") ?? "").trim();
  if (!projectId || !creditId) {
    return;
  }

  const actorRole = await getActorProjectRole(projectId);
  if (!(actorRole === "project_admin" || actorRole === "super_user")) {
    return;
  }

  const safeEffortLevel =
    effortLevel === "easy" || effortLevel === "moderate" || effortLevel === "hard"
      ? effortLevel
      : "moderate";

  const client = createClient();
  const writer = env.supabaseServiceRoleKey ? createAdminClient() : client;
  const { data: credit } = await client
    .from("credits")
    .select("id, project_id")
    .eq("id", creditId)
    .maybeSingle();

  if (!credit || credit.project_id !== projectId) {
    return;
  }

  const { error } = await writer
    .from("credits")
    .update({
      what_to_submit: whatToSubmit,
      effort_level: safeEffortLevel,
      effort_guidance: effortGuidance,
    })
    .eq("id", creditId);

  if (error) {
    return;
  }
  const user = await getCurrentUser();
  await logSystemActivity(writer, {
    projectId,
    entityType: "credit",
    entityId: creditId,
    action: "guidance_updated",
    actorId: user?.id ?? null,
    actorRole: actorRole,
    summary: "Updated client guidance and effort profile.",
    details: { effort_level: safeEffortLevel },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/documents");
}

export async function createTeamMemberAction(
  _: TeamMemberActionState,
  formData: FormData,
): Promise<TeamMemberActionState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const role = String(formData.get("role") ?? "client");
  const password = String(formData.get("password") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  if (!fullName || !email || !password) {
    return { status: "error", message: "Name, email, and temporary password are required." };
  }

  const currentUser = await getCurrentUser();
  const allowedBySuperUser = ["super_admin", "project_admin", "client", "owner", "consultant", "architect", "mep", "contractor"];
  const allowedBySuperAdmin = ["client", "owner", "consultant", "architect", "mep", "contractor"];
  const allowedByProjectAdmin = ["client", "owner", "consultant"];
  const allowedByClient = ["owner"];
  const allowedByOwner = ["architect", "mep", "contractor"];
  const actingAsSuperUser = currentUser?.role === "super_user";
  const actingAsSuperAdmin = currentUser?.role === "super_admin";
  const actingAsProjectAdmin = currentUser?.role === "project_admin";
  const actingAsClient = currentUser?.role === "client";
  const actingAsOwner = currentUser?.role === "owner";
  const normalizedRole = role === "admin" ? "project_admin" : role;

  if (!actingAsSuperUser && !actingAsSuperAdmin && !actingAsProjectAdmin && !actingAsClient && !actingAsOwner) {
    return { status: "error", message: "You do not have permission to create new logins." };
  }

  if (actingAsSuperUser) {
    if (!allowedBySuperUser.includes(role)) {
      return { status: "error", message: "That role cannot be created from the Super User panel." };
    }
    if (role !== "super_admin" && !projectId) {
      return { status: "error", message: "Select a project for every non-Super Admin login." };
    }
  }

  if (actingAsSuperAdmin) {
    if (!projectId || !allowedBySuperAdmin.includes(role)) {
      return { status: "error", message: "Super Admin can create only project and client-side roles for a selected project." };
    }
  }

  if (actingAsProjectAdmin) {
    if (!projectId || !allowedByProjectAdmin.includes(role)) {
      return { status: "error", message: "Project Admin can create only Client, Project Owner, or Consultant roles for a selected project." };
    }
  }

  if (actingAsClient) {
    if (!projectId || !allowedByClient.includes(role)) {
      return { status: "error", message: "Client can create only the Project Owner for the selected project." };
    }
  }

  if (actingAsOwner) {
    if (!projectId || !allowedByOwner.includes(role)) {
      return { status: "error", message: "Project Owner can create only Architect, MEP Consultant, or Contractor roles for the selected project." };
    }
  }

  if (![...allowedBySuperUser, ...allowedBySuperAdmin, ...allowedByProjectAdmin, ...allowedByClient, ...allowedByOwner].includes(normalizedRole)) {
    return { status: "error", message: "Selected role is not supported." };
  }

  if (!env.isConfigured) {
    return { status: "error", message: "Live workspace credentials are not configured yet." };
  }

  if (!env.supabaseServiceRoleKey) {
    return {
      status: "error",
      message: "SUPABASE_SERVICE_ROLE_KEY is missing, so Tracknov cannot provision auth users yet.",
    };
  }

  const client = createClient();
  const { data: sessionData } = await client.auth.getUser();
  if (!sessionData.user) {
    return { status: "error", message: "Your session expired. Sign in again and retry." };
  }

  if (actingAsProjectAdmin) {
    const { data: projectAdminMembership } = await client
      .from("project_members")
      .select("id")
      .eq("user_id", sessionData.user.id)
      .eq("project_id", projectId)
      .in("role", ["project_admin", "admin"])
      .limit(1);

    if (!projectAdminMembership?.length) {
      return { status: "error", message: "You are not assigned as Project Admin on the selected project." };
    }
  }
  if (actingAsSuperAdmin) {
    const { data: existingSuperAdminMembership } = await client
      .from("project_members")
      .select("id")
      .eq("user_id", sessionData.user.id)
      .eq("project_id", projectId)
      .in("role", ["super_admin", "admin"])
      .limit(1);

    if (!existingSuperAdminMembership?.length) {
      return { status: "error", message: "You are not assigned as Super Admin on the selected project." };
    }
  }
  if (actingAsClient) {
    const { data: clientMembership } = await client
      .from("project_members")
      .select("id")
      .eq("user_id", sessionData.user.id)
      .eq("project_id", projectId)
      .eq("role", "client")
      .limit(1);

    if (!clientMembership?.length) {
      return { status: "error", message: "You are not assigned as Client on the selected project." };
    }
  }
  if (actingAsOwner) {
    const { data: ownerMembership } = await client
      .from("project_members")
      .select("id")
      .eq("user_id", sessionData.user.id)
      .eq("project_id", projectId)
      .eq("role", "owner")
      .limit(1);

    if (!ownerMembership?.length) {
      return { status: "error", message: "You are not assigned as Project Owner on the selected project." };
    }
  }

  if (![...allowedBySuperUser, ...allowedBySuperAdmin, ...allowedByProjectAdmin, ...allowedByClient, ...allowedByOwner].includes(normalizedRole)) {
    return { status: "error", message: "Selected role is not supported." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not initialize admin provisioning.",
    };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      company,
      role: normalizedRole,
    },
  });

  if (error || !data.user) {
    return {
      status: "error",
      message: error?.message ?? "Supabase could not create the login.",
    };
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    user_id: data.user.id,
    email,
    full_name: fullName,
    company,
    global_role: normalizedRole,
  });

  if (profileError) {
    return {
      status: "error",
      message: profileError.message || "Login created, but profile setup failed.",
    };
  }

  if (projectId) {
    const { error: membershipError } = await admin.from("project_members").insert({
      project_id: projectId,
      user_id: data.user.id,
      role: normalizedRole,
    });

    if (membershipError) {
      return {
        status: "error",
        message: membershipError.message || "Login created, but project assignment failed.",
      };
    }
  }

  await logSystemActivity(admin, {
    projectId: projectId || null,
    entityType: "team",
    entityId: data.user.id,
    action: "member_created",
    actorId: sessionData.user.id,
    actorRole: currentUser?.role ?? null,
    summary: `Provisioned ${fullName} as ${normalizedRole}.`,
    details: {
      email,
      company,
      assigned_project_id: projectId || null,
      assigned_role: normalizedRole,
    },
  });

  revalidatePath("/team");
  return {
    status: "success",
    message: `${fullName} was added successfully.`,
  };
}

export async function acceptProjectInviteAction(formData: FormData) {
  if (!env.isConfigured) {
    redirect("/login");
  }

  const token = String(formData.get("token") ?? "").trim();
  if (!token) {
    redirect("/dashboard");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=/invite/${token}`);
  }

  const client = createClient();
  const { data: invite } = await client
    .from("project_invites")
    .select("id, project_id, email, role, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    redirect("/dashboard");
  }

  if ((user.email ?? "").toLowerCase() !== invite.email.toLowerCase()) {
    redirect(`/invite/${token}`);
  }

  if (!invite.accepted_at) {
    const { data: existingMembership } = await client
      .from("project_members")
      .select("id")
      .eq("project_id", invite.project_id)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!existingMembership) {
      await client.from("project_members").insert({
        project_id: invite.project_id,
        user_id: user.id,
        role: invite.role,
      });
    }

    await client
      .from("project_invites")
      .update({
        accepted_by: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    const writer = env.supabaseServiceRoleKey ? createAdminClient() : client;
    await logSystemActivity(writer, {
      projectId: invite.project_id,
      entityType: "team",
      entityId: invite.id,
      action: "invite_accepted",
      actorId: user.id,
      actorRole: user.role,
      summary: `Accepted invite and joined project as ${invite.role}.`,
      details: {
        invite_email: invite.email,
        role: invite.role,
      },
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/projects/${invite.project_id}`);
  redirect(`/projects/${invite.project_id}`);
}
