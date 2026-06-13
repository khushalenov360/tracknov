import { creditStatuses } from "@/lib/core/constants";

export function toLegacyCreditStatus(rawState: string | undefined): keyof typeof creditStatuses {
  if (!rawState) return "pending";
  const normalized = rawState.toLowerCase();
  if (normalized === "complete" || normalized === "approved" || normalized === "closed") return "complete";
  if (normalized === "blocked" || normalized === "rejected") return "blocked";
  if (normalized === "in_progress" || normalized === "under_review" || normalized === "submitted" || normalized === "resubmitted") {
    return "in_progress";
  }
  if (normalized === "draft" || normalized === "assigned" || normalized === "not_started" || normalized === "pending" || normalized === "clarification" || normalized === "ready") {
    return "pending";
  }
  if (normalized in creditStatuses) return normalized as keyof typeof creditStatuses;
  return "pending";
}

export function resolveTrackerCellStatus(credit: any, aliases: readonly string[]) {
  const requiredSlots = (credit.documents_required ?? []).filter((doc: any) => aliases.includes(doc.type) || aliases.includes(doc.label));
  if (!requiredSlots.length || requiredSlots.every((doc: any) => !doc.required)) {
    return "NA";
  }

  const linkedDocs = (credit.documents ?? []).filter((doc: any) =>
    requiredSlots.some((slot: any) => slot.type === doc.doc_category || slot.label === doc.doc_category),
  );

  if (!linkedDocs.length) return "Required";

  const states = linkedDocs.map((doc: any) => String(doc.state ?? doc.status ?? "").toUpperCase());
  if (states.some((state: string) => state === "REJECTED" || state === "CLARIFICATION")) return "Clarification";
  if (states.some((state: string) => state === "SUBMITTED" || state === "UNDER_REVIEW" || state === "READY" || state === "UPLOADED")) return "Under Review";
  return "Received";
}
