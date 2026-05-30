import type { MemberRole } from "@/lib/types";

export type CanonicalDocumentState =
  | "uploaded"
  | "owner_review"
  | "admin_review"
  | "approved"
  | "rejected";

export type RawDocumentStatus = "uploaded" | "owner_approved" | "approved" | "rejected";

export function toCanonicalState(status: string): CanonicalDocumentState {
  if (status === "owner_approved") {
    return "admin_review";
  }
  if (status === "approved") {
    return "approved";
  }
  if (status === "rejected") {
    return "rejected";
  }
  return "uploaded";
}

const allowedTransitions: Record<CanonicalDocumentState, CanonicalDocumentState[]> = {
  uploaded: ["owner_review", "admin_review", "rejected"],
  owner_review: ["admin_review", "rejected"],
  admin_review: ["approved", "rejected"],
  approved: [],
  rejected: ["uploaded"],
};

export function canTransitionDocument(params: {
  fromStatus: string;
  toStatus: RawDocumentStatus;
  actorRole: MemberRole | string;
  allowOverride?: boolean;
}) {
  const { fromStatus, toStatus, actorRole, allowOverride } = params;
  if (allowOverride) {
    return true;
  }
  const from = toCanonicalState(fromStatus);
  const to = toCanonicalState(toStatus);
  const allowed = allowedTransitions[from] ?? [];
  if (!allowed.includes(to)) {
    return false;
  }

  const role = String(actorRole);
  const isOwner = role === "owner" || role === "super_user";
  const isAdmin = role === "project_admin" || role === "super_admin" || role === "super_user";

  if (toStatus === "owner_approved") {
    return isOwner && fromStatus === "uploaded";
  }
  if (toStatus === "approved") {
    return isAdmin && fromStatus === "owner_approved";
  }
  if (toStatus === "rejected") {
    return (isOwner && fromStatus === "uploaded") || (isAdmin && fromStatus === "owner_approved");
  }
  if (toStatus === "uploaded") {
    return fromStatus === "rejected";
  }
  return false;
}

export type TransitionSideEffects = {
  logSummary: string;
  reviewEventAction: "owner_forward" | "admin_approve" | "owner_reject" | "admin_reject" | "status_override";
  notificationType?: "admin_review_ready" | "uploader_approved" | "uploader_rejected";
  requiresRemark?: boolean;
};

export function getTransitionSideEffects(toStatus: RawDocumentStatus, isOwner: boolean, isAdmin: boolean, isOverride: boolean): TransitionSideEffects {
  if (isOverride && !["owner_approved", "approved", "rejected"].includes(toStatus)) {
    return {
      logSummary: "Updated review status.",
      reviewEventAction: "status_override",
    };
  }

  switch(toStatus) {
    case "owner_approved":
      return {
        logSummary: "Moved document to Project Admin review.",
        reviewEventAction: "owner_forward",
        notificationType: "admin_review_ready"
      };
    case "approved":
      return {
        logSummary: "Approved document for submission pack.",
        reviewEventAction: "admin_approve",
        notificationType: "uploader_approved"
      };
    case "rejected":
      return {
        logSummary: "Rejected document with review note.",
        reviewEventAction: isOwner && !isAdmin ? "owner_reject" : "admin_reject",
        notificationType: "uploader_rejected",
        requiresRemark: true
      };
    default:
      return {
        logSummary: "Updated review status.",
        reviewEventAction: "status_override"
      };
  }
}

export function getTransitionPayload(toStatus: RawDocumentStatus, actorId: string, isOwner: boolean, isAdmin: boolean, rejectionRemark?: string) {
  const now = new Date().toISOString();
  let payload: any = {
    status: toStatus,
    rejection_reason: toStatus === "rejected" ? rejectionRemark || "" : "",
  };

  if (toStatus === "owner_approved") {
    payload.owner_reviewed_by = actorId;
    payload.owner_reviewed_at = now;
  } else if (toStatus === "approved") {
    payload.reviewed_by = actorId;
    payload.reviewed_at = now;
  } else if (toStatus === "rejected") {
    if (isOwner && !isAdmin) {
      payload.owner_reviewed_by = actorId;
      payload.owner_reviewed_at = now;
    } else if (isAdmin) {
      payload.reviewed_by = actorId;
      payload.reviewed_at = now;
    }
  } else if (toStatus === "uploaded") {
    payload.owner_reviewed_by = null;
    payload.owner_reviewed_at = null;
    payload.reviewed_by = null;
    payload.reviewed_at = null;
  }

  return payload;
}
