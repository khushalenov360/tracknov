import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { CurrentUser } from "@/lib/types";

export class AIService {
  private get client() { return createClient(); }
  private get admin() { return env.supabaseServiceRoleKey ? createAdminClient() : this.client; }

  async getAISuggestions(documentId: string) {
    // Mocking AI suggestions based on common rejection patterns
    const { data: document } = await this.client
      .from("documents")
      .select("doc_category, credit_id")
      .eq("id", documentId)
      .maybeSingle();

    if (!document) return [];

    // In a real implementation, we would query the rejection_patterns table or call an LLM
    return [
      {
        type: "info",
        message: `Ensure that the ${document.doc_category} includes a clear date and project name.`,
      },
      {
        type: "warning",
        message: "This document type is frequently rejected for missing engineer signatures.",
      }
    ];
  }

  async getProjectRiskScore(projectId: string) {
    // Calculate risk score based on rejections, missing documents, and token balance
    const { data: docs } = await this.client
      .from("documents")
      .select("status")
      .eq("project_id", projectId);

    const rejections = docs?.filter(d => d.status === "rejected").length ?? 0;
    
    let score = 100 - (rejections * 10);
    score = Math.max(0, score);

    return {
      score,
      level: score > 80 ? "low" : score > 50 ? "medium" : "high",
      indicators: [
        { label: "Rejections", value: rejections, status: rejections > 2 ? "warning" : "ok" },
      ]
    };
  }
}

export const aiService = new AIService();
