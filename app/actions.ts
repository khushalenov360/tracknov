"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createProjectForCurrentUser,
  deleteProjectForCurrentUser,
  getCurrentUser,
  getProjectWorkspace,
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

  pathFor(projectId).forEach((path) => revalidatePath(path));
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/documents");
  revalidatePath("/credits");
}

export async function deleteProjectAction(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "").trim();
  const user = await getCurrentUser();
  if (!projectId || !canDeleteProjects(user?.role)) {
    return;
  }

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

  const { error } = await writer
    .from("documents")
    .update({
      status,
      rejection_reason: rejectionRemark,
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
    details: { from_status: currentStatus, to_status: status, rejection_remark: rejectionRemark },
  });

  if (rejectionRemark && user) {
    await client.from("remarks").insert({
      credit_id: creditId,
      document_id: documentId,
      author_id: user.id,
      role: actorRole,
      body: rejectionRemark,
    });
  }

  revalidatePath("/documents");
  pathFor(projectId).forEach((path) => revalidatePath(path));
}

export async function uploadDocumentAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!env.isConfigured) {
    return { ok: false, error: "Live workspace credentials are not configured yet." };
  }

  const projectId = String(formData.get("project_id") ?? "").trim();
  const creditId = String(formData.get("credit_id") ?? "").trim();
  const docCategory = String(formData.get("doc_category") ?? "").trim();
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
      notes,
      status: "uploaded",
    })
    .select("id")
    .single();
  if (dbError || !documentRow) {
    return { ok: false, error: dbError?.message ?? "Upload record could not be saved." };
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
    },
  });

  revalidatePath("/documents");
  pathFor(projectId).forEach((path) => revalidatePath(path));
  return { ok: true };
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
        .filter((item) => item.required && item.type)
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
  if (!(actorProjectRole === "super_user" || actorProjectRole === "super_admin" || actorProjectRole === "project_admin")) {
    return;
  }

  const { data: existing } = await client
    .from("documents")
    .select("id, project_id, file_name, status, credit_id, doc_category")
    .eq("id", documentId)
    .maybeSingle();

  if (!existing || existing.project_id !== projectId) {
    return;
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
    },
  });

  const { error } = await writer.from("documents").delete().eq("id", documentId);
  if (error) {
    return;
  }

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
  }

  pathFor(projectId).forEach((path) => revalidatePath(path));
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
  }

  revalidatePath("/dashboard");
  revalidatePath(`/projects/${invite.project_id}`);
  redirect(`/projects/${invite.project_id}`);
}
