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
import { runNotificationDigestJobs } from "@/lib/services/notification-jobs";
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
  if (!projectCode) return;

  const user = await getCurrentUser();
  if (!user) return;

  let project;
  try {
    project = await projectService.joinProjectByCode(user, projectCode);
    revalidatePath("/projects");
    revalidatePath("/dashboard");
  } catch (error: any) {
    console.error("[Actions] Join project failed:", error);
    redirect(`/projects?error=${encodeURIComponent(error.message || "invalid_code")}`);
  }

  if (project) {
    redirect(`/projects/${project.id}`);
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
  const status = String(formData.get("status")) as any;
  const rejectionRemark = String(formData.get("rejection_remark") ?? "").trim();
  const rejectionType = String(formData.get("rejection_type") ?? "").trim();
  
  const user = await getCurrentUser();
  if (!user) return;
  
  const mappedWorkflowState: WorkflowState =
    status === "owner_approved"
      ? "UNDER_REVIEW"
      : status === "approved"
        ? "APPROVED"
        : status === "rejected"
          ? (rejectionRemark ? "CLARIFICATION" : "REJECTED")
          : "READY";

  const formattedRemark = rejectionType && rejectionRemark ? `[${rejectionType}] ${rejectionRemark}` : rejectionRemark;

  try {
    await reviewService.transitionDocument(user, {
      documentId,
      projectId,
      newState: mappedWorkflowState,
      manualSubmit: true,
      updatedEvidence: Boolean(rejectionRemark),
      remarks: formattedRemark || null,
    });

    revalidatePath("/documents");
    pathFor(projectId).forEach((path) => revalidatePath(path));
  } catch (error) {
    // Handle error
  }
}

export async function transitionDocumentStateAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  if (!env.isConfigured) {
    return { ok: false, error: "Live workspace credentials are not configured yet." };
  }

  const documentId = String(formData.get("document_id") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const rawState = String(formData.get("new_state") ?? "").trim();
  const remarks = String(formData.get("remarks") ?? "").trim();
  const manualSubmit = String(formData.get("manual_submit") ?? "false") === "true";
  const updatedEvidence = String(formData.get("updated_evidence") ?? "false") === "true";
  const override = String(formData.get("override") ?? "false") === "true";
  const overrideReason = String(formData.get("override_reason") ?? "").trim();

  if (!documentId || !projectId) {
    return { ok: false, error: "Document and project are required." };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Session expired." };

  const canonicalMap: Record<string, CanonicalReviewState> = {
    uploaded: "uploaded",
    owner_review: "owner_review",
    admin_review: "admin_review",
    approved: "approved",
    rejected: "rejected",
  };
  const canonicalState = canonicalMap[rawState.toLowerCase()];
  const newState = (canonicalState
    ? fromCanonicalReviewState(canonicalState)
    : rawState.toUpperCase()) as WorkflowState;

  try {
    await reviewService.transitionDocument(user, {
      documentId,
      projectId,
      newState,
      manualSubmit,
      updatedEvidence,
      remarks: remarks || null,
      override,
      overrideReason: overrideReason || null,
    });

    revalidatePath("/documents");
    pathFor(projectId).forEach((path) => revalidatePath(path));
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message || "Transition failed." };
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
      fileHash: fileHash || null,
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
  if (!documentId || !projectId) return;

  const user = await getCurrentUser();
  if (!user) return;

  try {
    await documentService.resubmitDocument(user, {
      documentId,
      projectId,
      resubmitNote,
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

  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expired." };

  try {
    await memberService.createMember(user, {
      fullName,
      email,
      company,
      role,
      password,
      projectId,
    });

    revalidatePath("/team");
    return {
      status: "success",
      message: `${fullName} was added successfully.`,
    };
  } catch (error: any) {
    return {
      status: "error",
      message: error.message || "Failed to create team member.",
    };
  }
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

  try {
    const projectId = await memberService.acceptInvite(user, token);
    revalidatePath("/dashboard");
    revalidatePath(`/projects/${projectId}`);
    redirect(`/projects/${projectId}`);
  } catch (error) {
    redirect("/dashboard");
  }
}

export async function disableTeamMemberAction(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!userId || !reason) return;

  const user = await getCurrentUser();
  if (!user) return;

  await memberService.disableMember(user, { userId, reason });
  revalidatePath("/team");
}

export async function reactivateTeamMemberAction(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "").trim();
  if (!userId) return;

  const user = await getCurrentUser();
  if (!user) return;

  await memberService.reactivateMember(user, { userId });
  revalidatePath("/team");
}

export async function reassignTeamMemberAction(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "").trim();
  const fromProjectId = String(formData.get("from_project_id") ?? "").trim();
  const toProjectId = String(formData.get("to_project_id") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  if (!userId || !fromProjectId || !toProjectId || !role) return;

  const user = await getCurrentUser();
  if (!user) return;

  await memberService.reassignMemberProject(user, {
    userId,
    fromProjectId,
    toProjectId,
    role,
  });
  revalidatePath("/team");
  revalidatePath("/projects");
}

export async function assignCreditContributorAction(formData: FormData): Promise<void> {
  if (!env.isConfigured) return;

  const projectId = String(formData.get("project_id") ?? "").trim();
  const projectCreditId = String(formData.get("project_credit_id") ?? "").trim();
  const assignedUserIdRaw = String(formData.get("assigned_user_id") ?? "").trim();
  const assignedUserId = assignedUserIdRaw || null;

  if (!projectId || !projectCreditId) return;

  const user = await getCurrentUser();
  if (!user) return;

  try {
    await creditService.assignContributor(user, {
      projectId,
      projectCreditId,
      assignedUserId,
    });

    pathFor(projectId).forEach((path) => revalidatePath(path));
    revalidatePath("/tasks");
  } catch (error: any) {
    console.error("[Actions] assignCreditContributorAction failed:", error);
  }
}

export async function runNotificationDigestAction() {
  const user = await getCurrentUser();
  if (!user || !["super_user", "super_admin", "project_admin"].includes(user.role)) return;
  await runNotificationDigestJobs();
  revalidatePath("/dashboard");
  revalidatePath("/team");
}

export async function createValidationRuleAction(formData: FormData): Promise<void> {
  if (!env.isConfigured) return;

  const projectId = String(formData.get("project_id") ?? "").trim();
  const projectCreditId = String(formData.get("project_credit_id") ?? "").trim();
  const creditId = String(formData.get("credit_id") ?? "").trim();
  const docCategory = String(formData.get("doc_category") ?? "").trim();
  const ruleName = String(formData.get("rule_name") ?? "").trim();
  const requiredKeywordsRaw = String(formData.get("required_keywords") ?? "").trim();
  const severity = String(formData.get("severity") ?? "error").trim();

  if (!projectId || !projectCreditId || !creditId || !ruleName) return;

  const user = await getCurrentUser();
  if (!user) return;
  if (!canManageProject(user.role)) return;

  const keywords = requiredKeywordsRaw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const writer = env.supabaseServiceRoleKey ? createAdminClient() : createClient();
  const { error } = await writer.from("validation_rules").insert({
    project_id: projectId,
    project_credit_id: projectCreditId,
    credit_id: creditId,
    doc_category: docCategory || null,
    rule_name: ruleName,
    required_keywords: keywords,
    severity: severity === "warning" ? "warning" : "error",
    is_active: true,
  });

  if (error) return;

  revalidatePath(`/projects/${projectId}`);
}
