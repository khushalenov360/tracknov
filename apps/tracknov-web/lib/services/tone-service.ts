import { createAdminClient } from "@/lib/supabase/admin";

export type AssistantTone = "Executive" | "Operator" | "Power";

export class ToneService {
  async getUserTone(userId: string, role: string): Promise<AssistantTone> {
    const supabase = createAdminClient();
    
    // Fetch behavior metrics
    const { data: behavior } = await supabase
      .from("user_behavior")
      .select("usage_score, error_rate")
      .eq("user_id", userId)
      .maybeSingle();

    const score = behavior?.usage_score || 0;
    const errorRate = behavior?.error_rate || 0;

    // Logic:
    // 1. If error rate is high (> 30%), use Operator (Guided)
    if (errorRate > 0.3) {
      return "Operator";
    }

    // 2. If role is high-level or score is very high, use Executive
    if (role === "super_user" || role === "super_admin" || score > 80) {
      return "Executive";
    }

    // 3. Default for experienced users
    if (score > 40) {
      return "Power";
    }

    // 4. Default for new/low-usage users
    return "Operator";
  }

  getToneInstructions(tone: AssistantTone): string {
    switch (tone) {
      case "Executive":
        return "TONE: Executive Mode. Be extremely concise. Focus on ROI, project completion percentages, and high-level blockers. Use professional, results-oriented language.";
      case "Operator":
        return "TONE: Operator Mode (Guided). Be helpful and instructional. Explain *how* to resolve blockers. Break down complex tasks into simple steps. Use encouraging language.";
      case "Power":
        return "TONE: Power Mode. Be technical and fast. Use industry jargon correctly. Focus on technical data points, credit codes, and specific document requirements. No fluff.";
      default:
        return "";
    }
  }
}

export const toneService = new ToneService();
