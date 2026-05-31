import { SupabaseClient } from "@supabase/supabase-js";
import { CreditRow, ProfileMap } from "../assistant/snapshot";

export interface RequirementAssignment {
  requirementId: string;
  requirementType: "Narrative" | "Drawings" | "Calculations & Tables" | "Certificates" | "Tech Specs" | string;
  contributorId: string | null;
  contributorName: string | null;
  contributorRole: string | null;
}

export interface CreditAssignmentGraph {
  creditId: string;
  creditCode: string;
  creditName: string;
  status: string;
  completionPercentage: number;
  requirements: RequirementAssignment[];
}

export async function getCreditAssignmentGraph(
  projectIds: string[],
  credits: CreditRow[],
  reader: SupabaseClient
): Promise<Map<string, CreditAssignmentGraph>> {
  const result = new Map<string, CreditAssignmentGraph>();

  // Fetch all active assignments for these projects
  const { data: assignmentsData, error } = await reader
    .from("assignments")
    .select("project_credit_id, user_id, role, document_type")
    .in("project_id", projectIds)
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching credit assignments:", error);
  }

  const assignments = (assignmentsData ?? []) as Array<{
    project_credit_id: string;
    user_id: string;
    role: string;
    document_type: string;
  }>;

  const userIds = [...new Set(assignments.map(a => a.user_id).filter(Boolean))] as string[];
  const profileMap = new Map<string, { full_name: string; email: string }>();
  if (userIds.length > 0) {
    const { data: profilesData } = await reader
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);
    for (const p of profilesData ?? []) {
      profileMap.set(p.user_id, { full_name: p.full_name ?? "Unknown", email: p.email ?? "" });
    }
  }

  // Build a lookup map of assignments by credit_id and document_type
  const assignmentLookup = new Map<string, typeof assignments[0]>();
  for (const a of assignments) {
    if (a.project_credit_id && a.document_type) {
      assignmentLookup.set(`${a.project_credit_id}::${a.document_type}`, a);
    }
  }

  for (const credit of credits) {
    const requirements: RequirementAssignment[] = [];
    
    // Fallback if documents_required is missing or empty
    const docsRequired = Array.isArray(credit.documents_required) ? credit.documents_required : [];
    
    for (const req of docsRequired) {
      const type = req.type || req.label || "Document";
      const key = `${credit.id}::${type}`;
      const assignment = assignmentLookup.get(key);
      
      let contributorName = null;
      if (assignment?.user_id) {
        const profile = profileMap.get(assignment.user_id);
        contributorName = profile?.full_name ?? null;
      }
      
      requirements.push({
        requirementId: type, // Using type as ID since there's no inherent ID
        requirementType: type,
        contributorId: assignment?.user_id ?? null,
        contributorName: contributorName,
        contributorRole: assignment?.role ?? null,
      });
    }

    result.set(credit.id, {
      creditId: credit.id,
      creditCode: credit.credit_code,
      creditName: credit.credit_name ?? "",
      status: credit.state,
      completionPercentage: credit.completion_pct ?? 0,
      requirements,
    });
  }

  return result;
}
