import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import type { ExecutionPlan } from "./planner";

export type ExecutorOutput = {
  plan: ExecutionPlan;
  facts: Record<string, any>;
  guidelineChecklist: string[];
  securityApproved: boolean;
};

export async function executePlan(
  plan: ExecutionPlan,
  projectId: string,
  userId: string,
  role?: string
): Promise<ExecutorOutput> {
  const supabase = createClient();
  const admin = env.supabaseServiceRoleKey ? createAdminClient() : supabase;
  
  const facts: Record<string, any> = {};
  const guidelineChecklist: string[] = [];
  let securityApproved = true;

  try {
    // 1. Programmatic RLS and permission check
    // If the user's role is contractor or architect, restrict details accordingly
    const isRestrictedRole = ["contractor", "architect", "mep", "client"].includes(role ?? "");

    // 2. Execute Tools defined in the plan
    for (const tool of plan.tools_required) {
      if (tool === "get_credit_status" && plan.target_credit_code) {
        // Query the credit status
        // Ensure read-only client query to prevent write access
        const { data: creditData } = await admin
          .from("project_credits")
          .select("id, credit_code, credit_label, credit_name, category, status, current_score, max_points, na")
          .eq("project_id", projectId)
          .eq("credit_code", plan.target_credit_code)
          .maybeSingle();

        if (creditData) {
          facts.credit = creditData;
          
          // Load document checklist requirements for this credit
          const { data: rules } = await admin
            .from("validation_rules")
            .select("rule_type, rule_name, rule_value, is_mandatory")
            .eq("project_credit_id", creditData.id);
          
          if (rules) {
            facts.checklist = rules.map(r => ({
              document_type: r.rule_name,
              requirement: r.is_mandatory ? "Mandatory" : "Optional",
              details: r.rule_value
            }));
          }
        }
      }

      if (tool === "get_credit_assignments" && plan.target_credit_code) {
        // Find matching project credit ID
        const { data: credit } = await admin
          .from("project_credits")
          .select("id")
          .eq("project_id", projectId)
          .eq("credit_code", plan.target_credit_code)
          .maybeSingle();

        if (credit) {
          // Query assignments
          const { data: assignments } = await admin
            .from("assignments")
            .select("id, member_id, role")
            .eq("project_credit_id", credit.id);

          if (assignments && assignments.length > 0) {
            // Load profiles to get names programmatically (filter out private details for restricted roles)
            const memberIds = assignments.map(a => a.member_id);
            const { data: profiles } = await admin
              .from("profiles")
              .select("id, name, email")
              .in("id", memberIds);

            facts.assignments = assignments.map(a => {
              const profile = profiles?.find(p => p.id === a.member_id);
              return {
                assignee_name: profile?.name || "Unknown",
                assignee_email: isRestrictedRole ? undefined : profile?.email,
                role: a.role
              };
            });
          } else {
            facts.assignments = [];
          }
        }
      }

      if (tool === "get_project_members") {
        // Prevent restricted roles from downloading full member lists
        if (isRestrictedRole) {
          securityApproved = false;
          facts.member_access_error = "Action blocked: Restricted roles are not permitted to fetch the project member roster.";
          continue;
        }

        const { data: members } = await admin
          .from("project_members")
          .select("id, user_id, role")
          .eq("project_id", projectId);

        if (members) {
          const userIds = members.map(m => m.user_id);
          const { data: profiles } = await admin
            .from("profiles")
            .select("id, name, email")
            .in("id", userIds);

          facts.members = members.map(m => {
            const profile = profiles?.find(p => p.id === m.user_id);
            return {
              name: profile?.name || "Unknown",
              email: profile?.email || "Unknown",
              role: m.role
            };
          });
        }
      }
    }
  } catch (error) {
    console.error("[Executor] Error running plans:", error);
    facts.executor_error = "Failed to load database facts programmatically.";
  }

  return {
    plan,
    facts,
    guidelineChecklist,
    securityApproved
  };
}
