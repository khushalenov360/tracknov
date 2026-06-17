import { createClient } from "@supabase/supabase-js";
import type { HaritaContext } from "./vertexService";
import { resolveProjectRecord, type ProjectLookupInput } from "./supabaseService";

type GuidebookLookupInput = {
  query: string;
  topic?: string;
  creditCode?: string;
  limit?: number;
};

type GuidebookChunkRow = {
  content: string | null;
  metadata: Record<string, unknown> | null;
  created_at?: string | null;
};

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "do", "for", "from", "how",
  "i", "if", "in", "is", "it", "of", "on", "or", "our", "please", "show", "that",
  "the", "this", "to", "what", "which", "with", "you",
]);

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const admin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/[^a-z0-9.+/%-]+/i)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3 && !STOP_WORDS.has(term));
}

function compactExcerpt(value: string, maxLength = 700) {
  const singleLine = value.replace(/\s+/g, " ").trim();
  if (singleLine.length <= maxLength) {
    return singleLine;
  }
  return `${singleLine.slice(0, maxLength - 3).trim()}...`;
}

function extractCreditCode(query: string) {
  const match = query.toUpperCase().match(/\b([A-Z]{2,4}\s?C\d+(?:\.\d+)?)\b/);
  return match ? match[1].replace(/\s+/g, " ").trim() : null;
}

function lookupInputFromContext(context?: HaritaContext): ProjectLookupInput {
  return {
    projectId: context?.projectId,
    title: context?.title,
    currentItem: context?.currentItem,
  };
}

async function resolveProjectGuidebook(projectId: string) {
  if (!admin) return null;

  const { data } = await admin
    .from("project_guidebooks")
    .select("id,title,file_name,created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; title: string | null; file_name: string | null; created_at: string | null }>();

  return data ?? null;
}

async function fetchGuidebookChunks(projectId: string) {
  if (!admin) {
    return [] as GuidebookChunkRow[];
  }

  const { data } = await admin
    .from("embeddings")
    .select("content, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(400);

  return ((data || []) as GuidebookChunkRow[]).filter((row) => {
    const metadata = row.metadata || {};
    return metadata.source === "guidebook_pdf" && metadata.project_id === projectId;
  });
}

function inferHeading(metadata: Record<string, unknown> | null, content: string) {
  const metadataHeading = typeof metadata?.heading === "string"
    ? metadata.heading
    : typeof metadata?.section_heading === "string"
      ? metadata.section_heading
      : typeof metadata?.file_name === "string"
        ? metadata.file_name
        : null;

  if (metadataHeading) {
    return metadataHeading;
  }

  const firstLine = content.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  if (firstLine && firstLine.length <= 120) {
    return firstLine;
  }

  return "Guidebook excerpt";
}

function inferHeadingPath(metadata: Record<string, unknown> | null, heading: string) {
  if (Array.isArray(metadata?.heading_path)) {
    const path = metadata.heading_path.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    if (path.length) return path;
  }

  if (typeof metadata?.section_heading === "string" && metadata.section_heading.trim()) {
    return [metadata.section_heading.trim()];
  }

  if (typeof metadata?.file_name === "string" && metadata.file_name.trim()) {
    return [metadata.file_name.trim(), heading];
  }

  return [heading];
}

function extractFormulaReferences(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /[=<>%/]|formula|calculation|ratio/i.test(line))
    .slice(0, 6);
}

function scoreChunk(content: string, metadata: Record<string, unknown> | null, terms: string[], creditCode?: string) {
  const normalizedContent = normalizeText(content);
  const metadataText = normalizeText(JSON.stringify(metadata || {}));
  let score = 0;

  for (const term of terms) {
    if (metadataText.includes(term)) score += 7;
    if (normalizedContent.includes(term)) score += 4;
  }

  const queryPhrase = terms.join(" ");
  if (queryPhrase && normalizedContent.includes(queryPhrase)) {
    score += 20;
  }

  const normalizedCreditCode = normalizeText(creditCode || "");
  if (normalizedCreditCode && (normalizedContent.includes(normalizedCreditCode) || metadataText.includes(normalizedCreditCode))) {
    score += 18;
  }

  return score;
}

export function getGuidebookStatus() {
  return {
    available: Boolean(admin),
    backend: "supabase_embeddings",
  };
}

export async function lookupGuidebookClause(
  input: GuidebookLookupInput,
  context?: HaritaContext,
) {
  const status = getGuidebookStatus();
  if (!status.available) {
    return {
      matchFound: false,
      reason: "Supabase guidebook retrieval is unavailable: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.",
      ...status,
      excerpts: [],
    };
  }

  const terms = [
    ...tokenize(input.query || ""),
    ...tokenize(input.topic || ""),
    ...tokenize(input.creditCode || ""),
  ];

  if (!terms.length) {
    return {
      matchFound: false,
      reason: "A non-empty guidebook query is required.",
      ...status,
      excerpts: [],
    };
  }

  const project = await resolveProjectRecord(lookupInputFromContext(context));
  if (!project) {
    return {
      matchFound: false,
      reason: "No active project context was resolved for guidebook retrieval.",
      requested_query: input.query,
      ...status,
      excerpts: [],
    };
  }

  const [guidebook, chunks] = await Promise.all([
    resolveProjectGuidebook(project.id),
    fetchGuidebookChunks(project.id),
  ]);

  if (!guidebook) {
    return {
      matchFound: false,
      reason: `No uploaded guidebook was found for project ${project.name}.`,
      requested_query: input.query,
      project_context: {
        id: project.id,
        name: project.name,
      },
      ...status,
      excerpts: [],
    };
  }

  if (!chunks.length) {
    return {
      matchFound: false,
      reason: `Guidebook metadata exists for ${project.name}, but no guidebook RAG chunks were found in Supabase embeddings.`,
      requested_query: input.query,
      project_context: {
        id: project.id,
        name: project.name,
      },
      guidebook: guidebook,
      ...status,
      excerpts: [],
    };
  }

  const creditCode = input.creditCode || extractCreditCode(input.query) || undefined;
  const ranked = chunks
    .map((row) => {
      const content = String(row.content || "").trim();
      return {
        row,
        content,
        score: content ? scoreChunk(content, row.metadata, terms, creditCode) : 0,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(input.limit || 4, 6)));

  const excerpts = ranked.map(({ row, content, score }, index) => {
    const heading = inferHeading(row.metadata, content);
    return {
      chunk_id: `${project.id}-guidebook-${index + 1}`,
      heading,
      heading_path: inferHeadingPath(row.metadata, heading),
      clause_excerpt: compactExcerpt(content),
      formula_references: extractFormulaReferences(content),
      relevance_score: score,
      source: row.metadata?.source || "guidebook_pdf",
    };
  });

  return {
    matchFound: excerpts.length > 0,
    requested_query: input.query,
    requested_topic: input.topic || null,
    requested_credit_code: creditCode || null,
    citation_policy: "Cite headings, clause text, and formula references only. Do not cite page numbers.",
    project_context: {
      id: project.id,
      name: project.name,
    },
    guidebook: guidebook,
    ...status,
    excerpts,
  };
}

export async function buildLocalGuidebookContext(query: string, context?: HaritaContext, topic?: string) {
  const result = await lookupGuidebookClause({ query, topic, limit: 3 }, context);
  if (!result.matchFound) {
    const reason = "reason" in result && typeof result.reason === "string"
      ? result.reason
      : null;
    return reason
      ? `No guidebook excerpts were retrieved for this local fallback request. Reason: ${reason}`
      : "No guidebook excerpts were retrieved for this local fallback request.";
  }

  return result.excerpts
    .map((excerpt, index) => [
      `MATCH ${index + 1}`,
      `HEADING PATH: ${excerpt.heading_path.join(" > ")}`,
      `CLAUSE: ${excerpt.clause_excerpt}`,
      excerpt.formula_references.length
        ? `FORMULA REFERENCES: ${excerpt.formula_references.join(" | ")}`
        : "FORMULA REFERENCES: None captured in this clause.",
    ].join("\n"))
    .join("\n\n");
}
