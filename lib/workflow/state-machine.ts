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

