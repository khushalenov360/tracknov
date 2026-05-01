import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export type DemoStep = {
  id: string;
  title: string;
  instruction: string;
  target: string;
  position: "top" | "bottom" | "left" | "right";
  highlightId: string;
};

export class DemoService {
  private get admin() { return createAdminClient(); }

  /**
   * Returns the 8-step guided demo flow.
   */
  getDemoWalkthrough(): DemoStep[] {
    return [
      {
        id: "step-1",
        title: "Portfolio Dashboard",
        instruction: "Welcome to Tracknov. This dashboard gives you a high-level view of your entire certification portfolio, including completion percentages and risk levels.",
        target: "/dashboard",
        position: "bottom",
        highlightId: "portfolio-overview",
      },
      {
        id: "step-2",
        title: "Project Detail",
        instruction: "Drill down into a specific project. See how credits are distributed across categories and their current workflow states.",
        target: "/projects/[id]",
        position: "right",
        highlightId: "credit-grid",
      },
      {
        id: "step-3",
        title: "Pending Work",
        instruction: "Quickly access credits that require attention. The system automatically prioritizes critical tasks for you.",
        target: "/projects/[id]",
        position: "top",
        highlightId: "pending-list",
      },
      {
        id: "step-4",
        title: "Simulated Upload",
        instruction: "Uploading evidence is simple. Our AI pre-checks files for relevance and quality before you even hit submit.",
        target: "/documents",
        position: "bottom",
        highlightId: "upload-zone",
      },
      {
        id: "step-5",
        title: "Review Workflow",
        instruction: "Experience the multi-tier review process. Approve or reject documents with structured feedback templates.",
        target: "/review-queue",
        position: "left",
        highlightId: "action-buttons",
      },
      {
        id: "step-6",
        title: "Rejection Insight",
        instruction: "When a document is rejected, Tracknov provides actionable insights on exactly how to fix it to ensure approval.",
        target: "/documents",
        position: "right",
        highlightId: "rejection-card",
      },
      {
        id: "step-7",
        title: "Executive Summary",
        instruction: "The executive dashboard aggregates risk and completion metrics for stakeholder reporting.",
        target: "/dashboard",
        position: "bottom",
        highlightId: "executive-cards",
      },
      {
        id: "step-8",
        title: "Token & Cost View",
        instruction: "Transparency in costs. Monitor your token usage and burn rate in real-time to manage your budget effectively.",
        target: "/team",
        position: "left",
        highlightId: "token-usage",
      },
    ];
  }

  /**
   * Resets the demo project for a specific user by calling the DB seed function.
   */
  async resetDemo(userId: string) {
    if (!env.supabaseServiceRoleKey) throw new Error("Admin access required for demo reset.");

    // 1. Find and delete existing demo project for this user
    const { data: demoProject } = await this.admin
      .from("projects")
      .select("id")
      .eq("project_code", "TN-DEMO-MUM-001")
      .maybeSingle();

    if (demoProject) {
      await this.admin.from("projects").delete().eq("id", demoProject.id);
    }

    // 2. Re-seed the demo data
    const { data: newProjectId, error } = await this.admin.rpc("seed_demo_data", {
      p_user_id: userId,
    });

    if (error) throw error;
    return newProjectId;
  }
}

export const demoService = new DemoService();
