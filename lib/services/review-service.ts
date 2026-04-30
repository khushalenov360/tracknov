import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

type ReviewEventInput = {
  documentId: string;
  projectId: string;
  reviewerId?: string | null;
  reviewerRole?: string | null;
  action: "owner_forward" | "admin_approve" | "owner_reject" | "admin_reject" | "resubmit" | "status_override";
  statusAfter: string;
  remarks?: string | null;
};

export async function recordDocumentReviewEvent(input: ReviewEventInput) {
  const writer = env.supabaseServiceRoleKey ? createAdminClient() : createClient();
  await writer.from("document_reviews").insert({
    document_id: input.documentId,
    project_id: input.projectId,
    reviewer_id: input.reviewerId ?? null,
    reviewer_role: input.reviewerRole ?? null,
    action: input.action,
    status_after: input.statusAfter,
    remarks: input.remarks ?? null,
  });
}

