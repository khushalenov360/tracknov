"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createProjectForCurrentUser,
  deleteProjectForCurrentUser,
  getCurrentUser,
  getOrCreateOnboardingChecklist,
  getProjectWorkspace,
  updateOnboardingChecklistForCurrentUser,
  updateProjectForCurrentUser,
} from "@/lib/data";
import { env } from "@/lib/env";
import { projectService } from "@/lib/services/project-service";
import { billingService } from "@/lib/services/billing-service";
import { memberService } from "@/lib/services/member-service";
import { documentService } from "@/lib/services/document-service";
import { creditService } from "@/lib/services/credit-service";
import { reviewService } from "@/lib/services/review-service";
import { workflowOrchestratorService } from "@/lib/services/workflow-orchestrator-service";
import { runNotificationDigestJobs } from "@/lib/services/notification-jobs";
import { logSystemActivity } from "@/lib/services/activity-service";
import { type WorkflowState, fromCanonicalReviewState, type CanonicalReviewState } from "@/lib/services/document-state-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import {
  canAccessBillingAndInvoice,
  canManageTokens,
  canEditPlanControls,
  canCreateProjects,
  canDeleteProjects,
  canManageProject,
} from "@/lib/rbac";
import { canTransitionDocument } from "@/lib/workflow/state-machine";
import type { RawDocumentStatus } from "@/lib/workflow/state-machine";
import { executeDocumentTransition } from "@/lib/services/workflow-service";
import { createTask, delegateTask, updateTaskState } from "@/lib/services/task-service";
import { TaskPriority, TaskState } from "@/lib/types";

function pathFor(projectId: string) {
  return [`/dashboard`, `/projects/${projectId}`, `/projects/${projectId}/submission`];
}

export type TeamMemberActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const uploadAllowedExtensions = [".pdf", ".docx", ".png", ".jpg", ".jpeg"] as const;
const uploadMaxBytes = 10 * 1024 * 1024;







export async function createProjectAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const clientName = String(formData.get("client") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const ratingSystemId = String(formData.get("rating_system_id") ?? "").trim();
  const ratingSystemName = String(formData.get("rating_system") ?? "").trim();

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/projects");
  }

  const targetRating = String(formData.get("target_rating") ?? "Certified").trim();
  const projectType = String(formData.get("project_type") ?? "commercial").trim();
  const status = String(formData.get("status") ?? "active").trim();
  const greenCertification = String(formData.get("green_certification") ?? "IGBC").trim();
  const igbcVariant = String(formData.get("igbc_variant") ?? "new").trim();

  let newProjectId: string | undefined;
  try {
    const project = await projectService.createProject(user, {
      name,
      ratingSystemId: ratingSystemId || undefined,
      ratingSystemName: ratingSystemName || undefined,
      targetRating,
      clientName,
      location,
      projectType,
      state: status, // Map status to state in DB
      greenCertification,
      igbcVariant,
    });

    pathFor(project.id).forEach((path) => revalidatePath(path));
    revalidatePath("/projects");
    revalidatePath("/documents");
    revalidatePath("/credits");

    newProjectId = project.id;
  } catch (err: any) {
    console.error("Project creation failed:", err);
    redirect(`/projects?error=${err.message}`);
  }

  if (newProjectId) {
    redirect(`/projects/${newProjectId}`);
  }
}

export async function joinProjectAction(formData: FormData) {
  const projectCode = String(formData.get("projectCode") ?? "").trim().toUpperCase();
  console.log("[Actions] User attempting to join project with code:", projectCode);
  
  if (!projectCode) {
    console.warn("[Actions] No project code provided.");
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    console.error("[Actions] User not authenticated during joinProjectAction.");
    redirect("/login?next=/projects");
    return;
  }

  let project;
  try {
    project = await projectService.joinProjectByCode(user, projectCode);
    console.log("[Actions] Join project successful, revalidating paths...");
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    revalidatePath(`/projects/${project.id}`);
  } catch (error: any) {
    console.error("[Actions] Join project failed:", error);
    // Next.js redirect throws a specific error that should not be caught as a normal error
    if (error.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    redirect(`/projects?error=${encodeURIComponent(error.message || "invalid_code")}`);
  }

  if (project) {
    console.log("[Actions] Redirecting to project workspace:", project.id);
    redirect(`/projects/${project.id}`);
  } else {
    console.warn("[Actions] Join project returned no project object, staying on page.");
  }
}


export async function leaveProjectAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!projectId) return;

  const user = await getCurrentUser();
  if (!user) return;

  try {
    await memberService.removeMember(user, {
      projectId,
      userId: user.id,
    });
    revalidatePath("/projects");
    revalidatePath("/dashboard");
  } catch (error: any) {
    console.error("[Actions] Leave project failed:", error);
    // You could redirect with an error message here if needed
  }
}

export async function updateProjectAction(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const clientName = String(formData.get("client") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const ratingSystem = String(formData.get("rating_system") ?? "").trim();
  const status = String(formData.get("status") ?? "active").trim();

  if (!projectId || !name || !clientName || !location || !ratingSystem) return;

  const user = await getCurrentUser();
  if (!user) return;

  try {
    await projectService.updateProject(user, projectId, {
      name,
      clientName,
      location,
      ratingSystem,
      state: status,
    });

    pathFor(projectId).forEach((path) => revalidatePath(path));
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    revalidatePath("/documents");
    revalidatePath("/credits");
  } catch (error) {
    // Handle error
  }
}

export async function updateProjectPlanSettingsAction(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "").trim();
  const planCode = String(formData.get("plan_code") ?? "starter").trim();
  const documentCreditLimit = Number(formData.get("document_credit_limit") ?? 0);
  const consultantCreditLimit = Number(formData.get("consultant_credit_limit") ?? 0);
  const topupDocumentCredits = Number(formData.get("topup_document_credits") ?? 0);
  const topupConsultantCredits = Number(formData.get("topup_consultant_credits") ?? 0);

  if (!projectId || !planCode) return;

  const user = await getCurrentUser();
  if (!user) return;
  if (!canEditPlanControls(user.role)) return;

  await billingService.updateBillingSettings(user, {
    projectId,
    planCode,
    documentCreditLimit,
    consultantCreditLimit,
    topupDocumentCredits,
    topupConsultantCredits,
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

  if (!projectId) return;

  const user = await getCurrentUser();
  if (!user) return;
  if (!canManageTokens(user.role)) return;

  await billingService.consumeConsultantTokens(user, {
    projectId,
    source,
    notes,
    creditsBurned,
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

  if (!projectId) return;

  const user = await getCurrentUser();
  if (!user) return;
  if (!canManageTokens(user.role)) return;

  await billingService.createTopupInvoice(user, {
    projectId,
    documentCredits,
    consultantCredits,
    amountInr,
    notes,
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
  if (!projectId || !user) return;

  try {
    await projectService.deleteProject(user, projectId);
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    revalidatePath("/documents");
    revalidatePath("/credits");
    redirect("/projects");
  } catch (error) {
    // Handle error
  }
}

export async function addRemarkAction(formData: FormData) {
  if (!env.isConfigured) return;

  const user = await getCurrentUser();
  if (!user) return;

  const projectId = String(formData.get("project_id"));
  const creditId = String(formData.get("credit_id"));
  const roleValue = String(formData.get("role") ?? "consultant");
  const role = ["super_user", "l4_reserved", "owner", "client", "consultant", "architect", "mep", "contractor", "project_admin", "super_admin"].includes(roleValue)
    ? roleValue
    : "consultant";
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  try {
    await reviewService.addRemark(user, { projectId, creditId, role, body });
    pathFor(projectId).forEach((path) => revalidatePath(path));
  } catch (error) {
    // Handle error
  }
}

export async function setDocumentStatusAction(formData: FormData) {
  if (!env.isConfigured) return;

  const projectId = String(formData.get("project_id"));
  const documentId = String(formData.get("document_id"));
  const status = String(formData.get("status")) as RawDocumentStatus;
  const rejectionRemark = String(formData.get("rejection_remark") ?? "").trim();
  const rejectionType = String(formData.get("rejection_type") ?? "").trim();

  const idempotencyKey = String(formData.get("idempotency_key") ?? crypto.randomUUID()).trim();

  const user = await getCurrentUser();
  if (!user) return;
  const actorProjectRole = projectId ? await projectService.getActorProjectRole(projectId, user) : user?.role ?? null;
  const actorRole = actorProjectRole ?? user?.role ?? "consultant";

  // Map status to workflow state
  const mappedWorkflowState: WorkflowState =
    status === "owner_approved"
      ? "UNDER_L3_REVIEW"
      : status === "approved"
        ? "APPROVED"
        : status === "rejected"
          ? (rejectionRemark ? "CLARIFICATION" : "REJECTED")
          : "IN_PROGRESS";

  const formattedRemark = rejectionType && rejectionRemark ? `[${rejectionType}] ${rejectionRemark}` : rejectionRemark;

  try {
    await reviewService.transitionDocument(user, {
      documentId,
      projectId,
      newState: mappedWorkflowState,
      manualSubmit: true,
      updatedEvidence: Boolean(rejectionRemark),
      remarks: formattedRemark || null,
      idempotencyKey,
    });
    revalidatePath("/documents");
    pathFor(projectId).forEach((path) => revalidatePath(path));
  } catch (error) {
    // Handle error
  }
}

export async function bulkReviewDocumentsAction(formData: FormData) {
  if (!env.isConfigured) return;

  const action = String(formData.get("bulk_action") ?? "").trim() as "approve" | "reject";
  const rejectionType = String(formData.get("rejection_type") ?? "").trim();
  const remark = String(formData.get("rejection_remark") ?? "").trim();
  const documentIds = formData
    .getAll("document_ids")
    .map((value) => String(value))
    .filter(Boolean);

  if (!documentIds.length || !["approve", "reject"].includes(action)) return;

  const user = await getCurrentUser();
  if (!user) return;
  if (user.role === "project_admin" || user.role === "super_admin") return;

  try {
    const reader = env.supabaseServiceRoleKey ? createAdminClient() : createClient();
    const { data: docs } = await reader
      .from("project_document")
      .select("id, project_id")
      .in("id", documentIds);

    for (const doc of docs ?? []) {
      const projectId = String((doc as any).project_id ?? "").trim();
      if (!projectId) continue;

      const newState =
        action === "approve"
          ? "APPROVED"
          : (remark ? "CLARIFICATION" : "REJECTED");

      const formattedRemark =
        action === "reject" && rejectionType && remark
          ? `[${rejectionType}] ${remark}`
          : remark;

      await reviewService.transitionDocument(user, {
        documentId: String((doc as any).id),
        projectId,
        newState,
        manualSubmit: true,
        updatedEvidence: action === "reject" && Boolean(remark),
        remarks: action === "reject" ? (formattedRemark || null) : null,
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/documents");
    revalidatePath("/review-queue");
  } catch (error) {
    // Handle error
  }
}

export async function uploadDocumentAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!env.isConfigured) {
    return { ok: false, error: "Live workspace credentials are not configured yet." };
  }

  const projectId = String(formData.get("project_id") ?? "").trim();
  const creditId = String(formData.get("credit_id") ?? "").trim();
  const projectCreditId = String(formData.get("project_credit_id") ?? "").trim();
  const docCategory = String(formData.get("doc_category") ?? "").trim();
  const requirementSlot = String(formData.get("requirement_slot") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const fileHash = String(formData.get("file_hash") ?? "").trim();
  const idempotencyKey = String(formData.get("idempotency_key") ?? crypto.randomUUID()).trim();
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

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  try {
    const result = await documentService.uploadDocument(user, {
      projectId,
      creditId,
      projectCreditId,
      docCategory,
      requirementSlot,
      notes,
      file,
      clientChecksum: fileHash || undefined,
      idempotencyKey,
    } as any);

    revalidatePath("/documents");
    pathFor(projectId).forEach((path) => revalidatePath(path));
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message || "Upload failed." };
  }
}

export async function loadClientTokensAction(formData: FormData) {
  const clientUserId = String(formData.get("client_user_id") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const tokens = Number(formData.get("tokens") ?? 0);
  const reason = String(formData.get("reason") ?? "Project Admin top-up").trim();

  if (!clientUserId || !projectId || !tokens || tokens <= 0) return;

  const user = await getCurrentUser();
  if (!user) return;

  await billingService.loadClientTokens(user, {
    projectId,
    clientUserId,
    tokens,
    reason,
  });

  revalidatePath("/team");
  revalidatePath("/projects");
  revalidatePath("/documents");
}

export async function updateDocumentMetadataAction(formData: FormData) {
  if (!env.isConfigured) return;

  const documentId = String(formData.get("document_id") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const creditId = String(formData.get("credit_id") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const docCategory = String(formData.get("doc_category") ?? "").trim();

  if (!documentId || !projectId || !creditId || !docCategory) return;

  const user = await getCurrentUser();
  if (!user) return;

  try {
    await documentService.updateMetadata(user, {
      documentId,
      projectId,
      creditId,
      docCategory,
      notes,
    });

    revalidatePath("/documents");
    pathFor(projectId).forEach((path) => revalidatePath(path));
  } catch (error) {
    // Handle or log error
  }
}

export async function moveDocumentAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!env.isConfigured) return { ok: false, error: "Not configured." };

  const documentId = String(formData.get("document_id") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const creditId = String(formData.get("credit_id") ?? "").trim();
  const docCategory = String(formData.get("doc_category") ?? "").trim();

  if (!documentId || !projectId || !creditId || !docCategory) {
    return { ok: false, error: "Missing document, project, or target mapping." };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Session expired." };

  try {
    await documentService.updateMetadata(user, {
      documentId,
      projectId,
      creditId,
      docCategory,
      notes: "Moved mapping to another credit.",
    });

    revalidatePath("/documents");
    pathFor(projectId).forEach((path) => revalidatePath(path));
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message || "Move failed." };
  }
}

export async function deleteDocumentAction(formData: FormData) {
  if (!env.isConfigured) return;

  const documentId = String(formData.get("document_id") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  if (!documentId || !projectId) return;

  const user = await getCurrentUser();
  if (!user) return;

  try {
    await documentService.deleteDocument(user, { documentId, projectId });
    revalidatePath("/documents");
    pathFor(projectId).forEach((path) => revalidatePath(path));
  } catch (error) {
    // Handle error
  }
}

export async function resubmitDocumentAction(formData: FormData) {
  if (!env.isConfigured) return;

  const documentId = String(formData.get("document_id") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const resubmitNote = String(formData.get("resubmit_note") ?? "").trim();
  const idempotencyKey = String(formData.get("idempotency_key") ?? crypto.randomUUID()).trim();
  if (!documentId || !projectId) return;

  const user = await getCurrentUser();
  if (!user) return;

  try {
    await documentService.resubmitDocument(user, {
      documentId,
      projectId,
      resubmitNote,
      idempotencyKey,
    });

    revalidatePath("/documents");
    pathFor(projectId).forEach((path) => revalidatePath(path));
  } catch (error) {
    // Handle error
  }
}

export async function setCreditStateAction(formData: FormData) {
  if (!env.isConfigured) return;

  const projectId = String(formData.get("project_id"));
  const creditId = String(formData.get("credit_id"));
  const action = String(formData.get("action")) as "complete" | "blocked";
  const blockedBy = String(formData.get("blocked_by") ?? "").trim();

  const user = await getCurrentUser();
  if (!user) return;
  if (user.role !== "super_user") return;

  try {
    const state = action === "complete" ? "CLOSED" : "REJECTED";
    await creditService.setCreditState(user, {
      projectId,
      creditId,
      state,
      remarks: blockedBy || undefined,
    });
    pathFor(projectId).forEach((path) => revalidatePath(path));
  } catch (error) {
    // Handle error
  }
}

export async function uploadProjectGuidebookAction(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("guidebook");

  if (!projectId) {
    redirect(`/projects?error=${encodeURIComponent("Missing project id for guidebook upload.")}`);
  }
  if (!(file instanceof File) || file.size <= 0) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Please choose a valid guidebook file before uploading.")}`);
  }

  const user = await getCurrentUser();
  if (!user) {
    return;
  }

  try {
    await projectService.uploadProjectGuidebook(user, {
      projectId,
      file,
      title: title || undefined,
    });
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    redirect(`/projects/${projectId}?success=${encodeURIComponent("Guidebook uploaded and instantiation checked.")}`);
  } catch (error: any) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent(error?.message ?? "Guidebook upload failed.")}`);
  }
}

export async function importProjectTrackerBaselineAction(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "").trim();
  const file = formData.get("tracker_file");
  if (!projectId) {
    redirect(`/projects?error=${encodeURIComponent("Missing project id for tracker import.")}`);
  }
  if (!(file instanceof File) || file.size <= 0) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Please choose a valid tracker file before importing.")}`);
  }

  const user = await getCurrentUser();
  if (!user) return;

  try {
    await projectService.importTrackerBaseline(user, {
      projectId,
      file,
    });
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    revalidatePath("/credits");
    redirect(`/projects/${projectId}?success=${encodeURIComponent("Tracker baseline imported.")}`);
  } catch (error: any) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent(error?.message ?? "Tracker baseline import failed.")}`);
  }
}

export async function updateCreditDocumentRequirementsAction(formData: FormData) {
  if (!env.isConfigured) return;

  const projectId = String(formData.get("project_id") ?? "").trim();
  const creditId = String(formData.get("credit_id") ?? "").trim();
  const selectedTypes = formData.getAll("required_doc_types").map((v) => String(v));

  if (!projectId || !creditId) return;

  const user = await getCurrentUser();
  if (!user) return;

  try {
    await creditService.updateRequirements(user, { projectId, creditId, selectedTypes });
    pathFor(projectId).forEach((path) => revalidatePath(path));
  } catch (error) {
    // Handle error
  }
}

export async function updateCreditGuidanceAction(formData: FormData) {
  if (!env.isConfigured) return;

  const projectId = String(formData.get("project_id") ?? "").trim();
  const creditId = String(formData.get("credit_id") ?? "").trim();
  const whatToSubmit = String(formData.get("what_to_submit") ?? "").trim();
  const effortLevel = String(formData.get("effort_level") ?? "moderate").trim();
  const effortGuidance = String(formData.get("effort_guidance") ?? "").trim();

  if (!projectId || !creditId) return;

  const user = await getCurrentUser();
  if (!user) return;

  try {
    await creditService.updateGuidance(user, {
      projectId,
      creditId,
      whatToSubmit,
      effortLevel,
      effortGuidance,
    });
    pathFor(projectId).forEach((path) => revalidatePath(path));
  } catch (error) {
    // Handle error
  }
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

export async function createTaskAction(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const creditId = formData.get("credit_id") ? String(formData.get("credit_id")) : null;
  const taskType = String(formData.get("task_type") ?? "credit_documentation");
  const assignedTo = String(formData.get("assigned_to"));
  const priority = (formData.get("priority") as TaskPriority) || "MEDIUM";
  const dueDate = formData.get("due_date") ? String(formData.get("due_date")) : null;

  const user = await getCurrentUser();
  if (!user) return;
  const writer = env.supabaseServiceRoleKey ? createAdminClient() : createClient();

  try {
    await createTask(writer, {
      projectId,
      creditId,
      taskType,
      assignedBy: user.id,
      assignedTo,
      priority,
    });

    revalidatePath("/dashboard");
    pathFor(projectId).forEach((path) => revalidatePath(path));
  } catch (error: any) {
    return;
  }
}

export async function delegateTaskAction(formData: FormData) {
  const taskId = String(formData.get("task_id"));
  const delegatedTo = String(formData.get("delegated_to"));
  const notes = formData.get("notes") ? String(formData.get("notes")) : null;
  const projectId = String(formData.get("project_id"));

  const user = await getCurrentUser();
  if (!user) return;

  try {
    await delegateTask(taskId, user.id, delegatedTo);

    revalidatePath("/dashboard");
    pathFor(projectId).forEach((path) => revalidatePath(path));
  } catch (error: any) {
    return;
  }
}

export async function updateTaskStateAction(formData: FormData) {
  const taskId = String(formData.get("task_id"));
  const newState = String(formData.get("state")) as TaskState;
  const notes = formData.get("notes") ? String(formData.get("notes")) : null;
  const projectId = String(formData.get("project_id"));

  const user = await getCurrentUser();
  if (!user) return;

  try {
    await updateTaskState(taskId, user.id, {
      status: newState,
      notes: notes ?? undefined,
    });

    revalidatePath("/dashboard");
    pathFor(projectId).forEach((path) => revalidatePath(path));
  } catch (error: any) {
    return;
  }
}

export async function assignCreditContributorAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const projectId = String(formData.get("project_id"));
  const projectCreditId = String(formData.get("project_credit_id") || formData.get("credit_id"));
  const assignedUserId = String(formData.get("assigned_user_id") || formData.get("assigned_to")) || null;
  const documentType = String(formData.get("document_type") || formData.get("doc_type")) || null;
  const reason = String(formData.get("reason")) || null;

  try {
    const result = await workflowOrchestratorService.assignContributor(user, {
      projectId,
      projectCreditId,
      assignedUserId,
      documentType,
      reason,
    });

    if (!result.ok) {
      return;
    }

    revalidatePath("/dashboard");
    pathFor(projectId).forEach((path) => revalidatePath(path));
  } catch (error: any) {
    console.error("[assignCreditContributorAction] Error:", error);
    return;
  }
}

export async function assignTaskAction(formData: FormData) {
  await assignCreditContributorAction(formData);
}

export async function transitionSubmittalAction(
  projectId: string,
  submittalId: string,
  targetState: WorkflowState,
  reason?: string | null,
  override?: boolean,
) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  try {
    const result = await workflowOrchestratorService.transitionSubmittal(user, {
      projectId,
      submittalId,
      targetState,
      reason,
      override,
    });

    if (!result.ok) {
      return { error: result.message || "Transition failed" };
    }

    revalidatePath("/dashboard");
    pathFor(projectId).forEach((path) => revalidatePath(path));
    return { success: true };
  } catch (error: any) {
    console.error("[transitionSubmittalAction] Error:", error);
    return { error: error.message };
  }
}

export async function toggleSystemControlAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_user") {
    return;
  }

  const controlName = formData.get("controlName") as string;
  const isEnabled = formData.get("isEnabled") === "true";

  if (!["uploads", "exports", "notifications"].includes(controlName)) {
    return;
  }

  try {
    const client = createClient();
    const { error } = await client
      .from("system_controls")
      .update({ is_enabled: isEnabled, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq("feature_name", controlName);

    if (error) throw error;
    
    revalidatePath("/admin/operational-health");
  } catch (err: any) {
    return;
  }
}

export async function submitDocumentTransitionAction(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "").trim();
  const documentId = String(formData.get("document_id") ?? "").trim();
  const nextState = String(formData.get("target_state") ?? "").trim().toUpperCase() as WorkflowState;
  const reason = String(formData.get("reason") ?? "").trim();
  const idempotencyKey = String(formData.get("idempotency_key") ?? crypto.randomUUID()).trim();

  if (!projectId || !documentId || !nextState) {
    throw new Error("Missing transition payload.");
  }

  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const result = await workflowOrchestratorService.transition(user, {
    entityType: "document",
    entityId: documentId,
    projectId,
    targetState: nextState,
    reason: reason || null,
    idempotencyKey,
  });

  if (!result.ok) {
    throw new Error(result.message);
  }

  revalidatePath("/review-queue");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/documents");
}

export async function runNotificationDigestAction() {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_user") {
    throw new Error("Unauthorized");
  }

  await runNotificationDigestJobs();
  revalidatePath("/team");
  revalidatePath("/dashboard");
}

export async function disableTeamMemberAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const userId = String(formData.get("user_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!userId || !reason) throw new Error("User and reason are required.");

  try {
    await memberService.disableMember(user, { userId, reason });
    revalidatePath("/team");
  } catch (error: any) {
    throw new Error(error?.message ?? "Disable failed.");
  }
}

export async function reactivateTeamMemberAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const userId = String(formData.get("user_id") ?? "").trim();
  if (!userId) throw new Error("User is required.");

  try {
    await memberService.reactivateMember(user, { userId });
    revalidatePath("/team");
  } catch (error: any) {
    throw new Error(error?.message ?? "Reactivation failed.");
  }
}

export async function reassignTeamMemberAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const userId = String(formData.get("user_id") ?? "").trim();
  const fromProjectId = String(formData.get("from_project_id") ?? "").trim();
  const toProjectId = String(formData.get("to_project_id") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  if (!userId || !fromProjectId || !toProjectId || !role) {
    throw new Error("Incomplete reassignment payload.");
  }

  try {
    await memberService.reassignMemberProject(user, {
      userId,
      fromProjectId,
      toProjectId,
      role: role as any,
    });
    revalidatePath("/team");
    revalidatePath(`/projects/${fromProjectId}`);
    revalidatePath(`/projects/${toProjectId}`);
  } catch (error: any) {
    throw new Error(error?.message ?? "Reassignment failed.");
  }
}

export async function createValidationRuleAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const projectId = String(formData.get("project_id") ?? "").trim();
  const projectCreditId = String(formData.get("project_credit_id") ?? "").trim();
  const creditId = String(formData.get("credit_id") ?? "").trim();
  const docCategory = String(formData.get("doc_category") ?? "").trim();
  const ruleName = String(formData.get("rule_name") ?? "").trim();
  const severity = String(formData.get("severity") ?? "warning").trim();
  const rawKeywords = String(formData.get("required_keywords") ?? "").trim();
  const requiredKeywords = rawKeywords
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!projectId || !projectCreditId || !creditId || !docCategory || !ruleName) {
    return;
  }

  if (!canManageProject(user.role) && user.role !== "owner") {
    return;
  }

  const writer = env.supabaseServiceRoleKey ? createAdminClient() : createClient();
  const { error } = await writer.from("validation_rules").insert({
    project_id: projectId,
    project_credit_id: projectCreditId,
    credit_id: creditId,
    doc_category: docCategory,
    rule_name: ruleName,
    required_keywords: requiredKeywords,
    severity,
    is_active: true,
    created_by: user.id,
  });

  if (error) {
    return;
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/credits");
}
