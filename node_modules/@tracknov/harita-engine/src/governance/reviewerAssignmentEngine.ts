import { createAdminClient } from "@/lib/supabase/admin";
import { governanceLocalStorage } from "./governanceContext";

export interface AssignmentResult {
  reviewerId: string;
  queueId: string;
  priority: number;
}

/**
 * Deterministically assigns a reviewer to a submittal based on framework and specialization.
 */
export async function determineReviewerAssignment(
  projectId: string,
  submittalId: string,
  complexity: number = 1
): Promise<AssignmentResult> {
  const context = governanceLocalStorage.getStore();
  const admin = createAdminClient();

  // 1. Fetch available reviewers (L4/L5)
  const { data: reviewers, error: revError } = await admin
    .from("profiles")
    .select("user_id, global_role")
    .in("global_role", ["L4", "L5", "super_user"]);

  if (revError || !reviewers || reviewers.length === 0) {
    throw new Error("No qualified reviewers available in the platform.");
  }

  // 2. Deterministic Load Balancing (Simple Hash-based for now)
  // In a real system, this would query current workload from 'workflow_tasks'
  const submittalHash = Array.from(submittalId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const reviewerIndex = submittalHash % reviewers.length;
  const assignedReviewer = reviewers[reviewerIndex];

  // 3. Priority Calculation
  let priority = 1;
  if (context?.frameworkVersion === "GI_V2") {
    priority += 1; // V2 gets higher baseline priority
  }
  
  if (complexity > 5) {
    priority += 2;
  }

  return {
    reviewerId: assignedReviewer.user_id,
    queueId: `QUEUE_${context?.frameworkVersion || "GI_V1"}`,
    priority,
  };
}
