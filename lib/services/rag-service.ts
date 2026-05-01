import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

type RAGChunk = {
  content: string;
  metadata: Record<string, unknown>;
};

const EMBEDDING_DIM = 1536;

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function chunkText(text: string, maxChunkChars = 900) {
  const cleaned = normalizeWhitespace(text);
  if (!cleaned) return [] as string[];
  if (cleaned.length <= maxChunkChars) return [cleaned];

  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < cleaned.length) {
    const slice = cleaned.slice(cursor, cursor + maxChunkChars);
    chunks.push(slice);
    cursor += maxChunkChars;
  }
  return chunks;
}

function deterministicEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIM).fill(0);
  if (!text) return vector;

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    const slot = index % EMBEDDING_DIM;
    vector[slot] += (code % 97) / 97;
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!norm) return vector;
  return vector.map((value) => Number((value / norm).toFixed(8)));
}

function toVectorLiteral(vector: number[]) {
  return `[${vector.join(",")}]`;
}

function parseVector(input: unknown): number[] {
  if (Array.isArray(input)) return input.map((value) => Number(value));
  if (typeof input !== "string") return [];
  const trimmed = input.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return [];
  return trimmed
    .slice(1, -1)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
}

function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || !b.length || a.length !== b.length) return -1;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return -1;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class RAGService {
  private get client() { return createClient(); }
  private get admin() { return env.supabaseServiceRoleKey ? createAdminClient() : this.client; }

  private async upsertChunks(documentId: string | null, chunks: RAGChunk[]) {
    if (!chunks.length) return;
    if (documentId) {
      await this.admin.from("embeddings").delete().eq("document_id", documentId);
    }

    const rows = chunks.map((chunk) => ({
      document_id: documentId,
      content: chunk.content,
      embedding: toVectorLiteral(deterministicEmbedding(chunk.content)),
      metadata: chunk.metadata,
    }));

    await this.admin.from("embeddings").insert(rows);
  }

  async ingestApprovedDocument(documentId: string) {
    const { data: document } = await this.admin
      .from("project_document")
      .select("id, project_id, project_credit_id, file_name, doc_category, notes, state")
      .eq("id", documentId)
      .eq("state", "APPROVED")
      .maybeSingle();

    if (!document) return;

    const { data: credit } = await this.admin
      .from("project_credits")
      .select("credit_code, credit_name, documentation_summary, what_to_submit")
      .eq("id", document.project_credit_id)
      .maybeSingle();

    const baseText = [
      `File: ${document.file_name}`,
      `Document type: ${document.doc_category}`,
      `Credit: ${credit?.credit_code ?? "N/A"} ${credit?.credit_name ?? ""}`,
      `Credit guidance: ${credit?.what_to_submit ?? ""}`,
      `Documentation summary: ${credit?.documentation_summary ?? ""}`,
      `Reviewer notes: ${document.notes ?? ""}`,
    ]
      .filter(Boolean)
      .join("\n");

    const chunks = chunkText(baseText).map((content) => ({
      content,
      metadata: {
        source: "approved_document",
        project_id: document.project_id,
        project_credit_id: document.project_credit_id,
        document_id: document.id,
        doc_category: document.doc_category,
        file_name: document.file_name,
      },
    }));

    await this.upsertChunks(document.id, chunks);
  }

  async ingestProjectGuidance(projectId: string) {
    const { data: credits } = await this.admin
      .from("project_credits")
      .select("project_id, id, credit_code, credit_name, what_to_submit, documentation_summary")
      .eq("project_id", projectId);

    if (!credits?.length) return;

    const guidanceChunks: RAGChunk[] = [];
    for (const credit of credits) {
      if (!credit) continue;
      const text = [
        `Credit: ${credit.credit_code} ${credit.credit_name}`,
        `What to submit: ${credit.what_to_submit ?? ""}`,
        `Documentation summary: ${credit.documentation_summary ?? ""}`,
      ]
        .filter(Boolean)
        .join("\n");
      for (const content of chunkText(text)) {
        guidanceChunks.push({
          content,
          metadata: {
            source: "igbc_guidance",
            project_id: projectId,
            project_credit_id: credit.id,
            credit_code: credit.credit_code,
          },
        });
      }
    }

    // Clean previous guidance rows for this project
    await this.admin
      .from("embeddings")
      .delete()
      .contains("metadata", { source: "igbc_guidance", project_id: projectId });

    await this.upsertChunks(null, guidanceChunks);
  }

  async retrieveContext(params: { query: string; projectIds: string[]; limit?: number }) {
    const queryEmbedding = deterministicEmbedding(params.query);
    const limit = Math.max(1, Math.min(params.limit ?? 6, 12));
    if (!params.projectIds.length) return [] as Array<{ content: string; score: number; metadata: any }>;

    const { data: rows } = await this.admin
      .from("embeddings")
      .select("content, embedding, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    const filtered = (rows ?? []).filter((row: any) => {
      const projectId = row?.metadata?.project_id;
      return typeof projectId === "string" && params.projectIds.includes(projectId);
    });

    return filtered
      .map((row: any) => ({
        content: row.content as string,
        metadata: row.metadata,
        score: cosineSimilarity(queryEmbedding, parseVector(row.embedding)),
      }))
      .filter((item) => Number.isFinite(item.score))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

export const ragService = new RAGService();

