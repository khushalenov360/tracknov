import { createClient } from "@/lib/supabase/server";
import { scoreIgbcCredits } from "@/lib/igbc-scoring";
import type { IgbcVariant, ProjectWorkspace } from "@/lib/types";

type ScoreCategory = {
  category: string;
  total: number;
  earned: number;
};

type ScoreLevel = {
  level: string;
  recognition?: string;
} | null;

export type AuthoritativeProjectScore = {
  earned: number;
  totalAvailable: number;
  percent: number;
  level: ScoreLevel;
  categories: ScoreCategory[];
  source: "db" | "service_fallback";
};

function normalizeLevel(level: unknown): ScoreLevel {
  if (!level) return null;
  if (typeof level === "string") return { level };
  if (typeof level === "object" && level !== null && "level" in (level as Record<string, unknown>)) {
    const levelText = String((level as Record<string, unknown>).level ?? "").trim();
    if (!levelText) return null;
    const recognition = String((level as Record<string, unknown>).recognition ?? "").trim();
    return recognition ? { level: levelText, recognition } : { level: levelText };
  }
  return null;
}

function normalizeDbScore(
  dbScore: Record<string, unknown>,
  fallback: ReturnType<typeof scoreIgbcCredits>,
): AuthoritativeProjectScore {
  const earned = Number(dbScore.earned ?? dbScore.total_points_earned ?? fallback.earned);
  const totalAvailable = Number(dbScore.total_available ?? dbScore.total_points_available ?? fallback.totalAvailable);
  const percent = Number(dbScore.percent ?? dbScore.score_pct ?? (totalAvailable ? Math.round((earned / totalAvailable) * 100) : 0));
  const level = normalizeLevel(dbScore.level ?? dbScore.certification_level ?? fallback.level);
  const categories = Array.isArray(dbScore.categories)
    ? (dbScore.categories as ScoreCategory[])
    : fallback.categories;

  return {
    earned,
    totalAvailable,
    percent,
    level,
    categories,
    source: "db",
  };
}

export async function getAuthoritativeProjectScore(workspace: ProjectWorkspace): Promise<AuthoritativeProjectScore> {
  const fallback = scoreIgbcCredits(workspace.credits, workspace.project.igbc_variant as IgbcVariant);
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_project_certification_summary", {
    p_project_id: workspace.project.id,
  });

  if (!error && data && typeof data === "object") {
    return normalizeDbScore(data as Record<string, unknown>, fallback);
  }

  return {
    earned: fallback.earned,
    totalAvailable: fallback.totalAvailable,
    percent: fallback.percent,
    level: normalizeLevel(fallback.level),
    categories: fallback.categories,
    source: "service_fallback",
  };
}
