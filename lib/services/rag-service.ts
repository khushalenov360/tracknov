import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { extractTextFromPdf, cleanPdfText } from "./pdf-extractor";

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

/**
 * Chunk text by paragraph boundaries, respecting a max chunk size.
 * Keeps semantically related sentences together for better RAG recall.
 */
function chunkByParagraphs(text: string, maxChunkChars = 900): string[] {
  // Split on double newlines (paragraph breaks) first
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (!current) {
      current = para;
    } else if ((current + "\n\n" + para).length <= maxChunkChars) {
      current += "\n\n" + para;
    } else {
      chunks.push(current.trim());
      // If a single paragraph is too large, split it by character
      if (para.length > maxChunkChars) {
        for (const sub of chunkText(para, maxChunkChars)) {
          chunks.push(sub);
        }
        current = "";
      } else {
        current = para;
      }
    }
  }

  if (current.trim()) chunks.push(current.trim());
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

function extractCreditCode(query: string) {
  const match = query.toUpperCase().match(/\b([A-Z]{2,4}\s?C\d+(?:\.\d+)?)\b/);
  return match ? match[1].replace(/\s+/g, " ").trim() : null;
}

export class RAGService {
  private get client() { return createClient(); }
  private get admin() { return env.supabaseServiceRoleKey ? createAdminClient() : this.client; }

  private async fetchCreditById(creditId: string) {
    const preferredSelect = "credit_code, credit_name, documentation_summary, what_to_submit";
    const fallbackSelect = "credit_code, credit_name, what_to_submit";
    const attempt = await this.admin
      .from("project_credits")
      .select(preferredSelect)
      .eq("id", creditId)
      .maybeSingle();

    if (!attempt.error) {
      return attempt.data as any;
    }

    if (String((attempt.error as any)?.message ?? "").toLowerCase().includes("documentation_summary")) {
      const fallback = await this.admin
        .from("project_credits")
        .select(fallbackSelect)
        .eq("id", creditId)
        .maybeSingle();
      if (!fallback.error && fallback.data) {
        return { ...fallback.data, documentation_summary: null } as any;
      }
    }
    return null;
  }

  private async fetchProjectCredits(projectId: string) {
    const preferredSelect = "project_id, id, credit_code, credit_name, what_to_submit, documentation_summary";
    const fallbackSelect = "project_id, id, credit_code, credit_name, what_to_submit";
    const attempt = await this.admin
      .from("project_credits")
      .select(preferredSelect)
      .eq("project_id", projectId);

    if (!attempt.error) {
      return (attempt.data ?? []) as any[];
    }

    if (String((attempt.error as any)?.message ?? "").toLowerCase().includes("documentation_summary")) {
      const fallback = await this.admin
        .from("project_credits")
        .select(fallbackSelect)
        .eq("project_id", projectId);
      if (!fallback.error) {
        return (fallback.data ?? []).map((row: any) => ({ ...row, documentation_summary: null }));
      }
    }
    return [];
  }

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

    const credit = await this.fetchCreditById(document.project_credit_id);

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
    const credits = await this.fetchProjectCredits(projectId);

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

  /**
   * Ingest the actual PDF content of a project guidebook into the RAG embeddings store.
   * Called after every guidebook upload. Replaces any previous guidebook embeddings for this project.
   */
  async ingestGuidebookPdf(params: {
    projectId: string;
    guidebookId: string;
    filePath: string;
    fileName: string;
  }) {
    // 1. Download the PDF from Supabase Storage
    const { data: fileData, error: downloadError } = await this.admin
      .storage
      .from("project-documents")
      .download(params.filePath);

    if (downloadError || !fileData) {
      console.error("[RAG] Failed to download guidebook for extraction:", downloadError);
      return;
    }

    // 2. Convert Blob → Buffer and extract text
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const rawText = await extractTextFromPdf(buffer);
    const cleanedText = cleanPdfText(rawText);

    if (!cleanedText || cleanedText.length < 50) {
      console.warn("[RAG] Guidebook PDF yielded no usable text — skipping embedding.");
      return;
    }

    // 3. Remove stale guidebook embeddings for this project
    await this.admin
      .from("embeddings")
      .delete()
      .contains("metadata", { source: "guidebook_pdf", project_id: params.projectId });

    // 4. Chunk by paragraphs and embed
    const textChunks = chunkByParagraphs(cleanedText, 900);
    const ragChunks: RAGChunk[] = textChunks.map((content, idx) => ({
      content,
      metadata: {
        source: "guidebook_pdf",
        project_id: params.projectId,
        guidebook_id: params.guidebookId,
        file_name: params.fileName,
        chunk_index: idx,
        total_chunks: textChunks.length,
      },
    }));

    await this.upsertChunks(null, ragChunks);
    console.log(`[RAG] Ingested ${ragChunks.length} chunks from guidebook "${params.fileName}" for project ${params.projectId}`);
  }

  async retrieveContext(params: { query: string; projectIds: string[]; limit?: number }) {
    const queryEmbedding = deterministicEmbedding(params.query);
    const queryLower = params.query.toLowerCase();
    const creditCodeInQuery = extractCreditCode(params.query);
    const isCreditQuery =
      queryLower.includes("credit") ||
      queryLower.includes("igbc") ||
      queryLower.includes("what to submit") ||
      queryLower.includes("guidance");
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
        score:
          cosineSimilarity(queryEmbedding, parseVector(row.embedding)) +
          (isCreditQuery && String(row?.metadata?.source ?? "") === "igbc_guidance" ? 0.08 : 0) +
          (creditCodeInQuery && String(row?.metadata?.credit_code ?? "").toUpperCase() === creditCodeInQuery ? 0.2 : 0) +
          // Boost real guidebook PDF content slightly so it surfaces alongside structured guidance
          (String(row?.metadata?.source ?? "") === "guidebook_pdf" ? 0.05 : 0),
      }))
      .filter((item) => Number.isFinite(item.score))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

export const ragService = new RAGService();
