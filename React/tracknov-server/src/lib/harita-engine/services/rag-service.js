"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ragService = exports.RAGService = void 0;
const admin_1 = require("@/lib/supabase/admin");
const server_1 = require("@/lib/supabase/server");
const env_1 = require("@/lib/env");
const pdf_extractor_1 = require("./pdf-extractor");
const headroom_compressor_1 = require("./headroom-compressor");
const EMBEDDING_DIM = 1536;
function normalizeWhitespace(text) {
    return text.replace(/\s+/g, " ").trim();
}
function chunkText(text, maxChunkChars = 900) {
    const cleaned = normalizeWhitespace(text);
    if (!cleaned)
        return [];
    if (cleaned.length <= maxChunkChars)
        return [cleaned];
    const chunks = [];
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
function chunkByParagraphs(text, maxChunkChars = 900) {
    // Split on double newlines (paragraph breaks) first
    const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    const chunks = [];
    let current = "";
    for (const para of paragraphs) {
        if (!current) {
            current = para;
        }
        else if ((current + "\n\n" + para).length <= maxChunkChars) {
            current += "\n\n" + para;
        }
        else {
            chunks.push(current.trim());
            // If a single paragraph is too large, split it by character
            if (para.length > maxChunkChars) {
                for (const sub of chunkText(para, maxChunkChars)) {
                    chunks.push(sub);
                }
                current = "";
            }
            else {
                current = para;
            }
        }
    }
    if (current.trim())
        chunks.push(current.trim());
    return chunks;
}
function generateEmbedding(text) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const vector = new Array(EMBEDDING_DIM).fill(0);
        if (!text)
            return vector;
        const apiKey = (_a = env_1.env.geminiApiKeys) === null || _a === void 0 ? void 0 : _a[0];
        if (!apiKey) {
            console.warn("[RAG] No Gemini API key found, returning zero vector");
            return vector;
        }
        try {
            const response = yield fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey,
                },
                body: JSON.stringify({
                    model: "models/gemini-embedding-2",
                    content: { parts: [{ text }] },
                }),
            });
            if (!response.ok) {
                console.error(`[RAG] Embedding failed: HTTP ${response.status} - ${yield response.text().catch(() => "")}`);
                return vector;
            }
            const data = yield response.json();
            const values = (_b = data.embedding) === null || _b === void 0 ? void 0 : _b.values;
            if (Array.isArray(values)) {
                // Pad to 1536 to match DB schema without migrating
                for (let i = 0; i < values.length && i < EMBEDDING_DIM; i++) {
                    vector[i] = values[i];
                }
            }
        }
        catch (error) {
            console.error("[RAG] Embedding error:", error);
        }
        return vector;
    });
}
function toVectorLiteral(vector) {
    return `[${vector.join(",")}]`;
}
function parseVector(input) {
    if (Array.isArray(input))
        return input.map((value) => Number(value));
    if (typeof input !== "string")
        return [];
    const trimmed = input.trim();
    if (!trimmed.startsWith("[") || !trimmed.endsWith("]"))
        return [];
    return trimmed
        .slice(1, -1)
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isFinite(item));
}
function cosineSimilarity(a, b) {
    if (!a.length || !b.length || a.length !== b.length)
        return -1;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i += 1) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (!normA || !normB)
        return -1;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
function extractCreditCode(query) {
    const match = query.toUpperCase().match(/\b([A-Z]{2,4}\s?C\d+(?:\.\d+)?)\b/);
    return match ? match[1].replace(/\s+/g, " ").trim() : null;
}
class RAGService {
    get client() { return (0, server_1.createClient)(); }
    get admin() { return env_1.env.supabaseServiceRoleKey ? (0, admin_1.createAdminClient)() : this.client; }
    fetchCreditById(creditId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const preferredSelect = "credit_code, credit_name, documentation_summary, what_to_submit";
            const fallbackSelect = "credit_code, credit_name, what_to_submit";
            const attempt = yield this.admin
                .from("project_credits")
                .select(preferredSelect)
                .eq("id", creditId)
                .maybeSingle();
            if (!attempt.error) {
                return attempt.data;
            }
            if (String((_b = (_a = attempt.error) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : "").toLowerCase().includes("documentation_summary")) {
                const fallback = yield this.admin
                    .from("project_credits")
                    .select(fallbackSelect)
                    .eq("id", creditId)
                    .maybeSingle();
                if (!fallback.error && fallback.data) {
                    return Object.assign(Object.assign({}, fallback.data), { documentation_summary: null });
                }
            }
            return null;
        });
    }
    fetchProjectCredits(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const preferredSelect = "project_id, id, credit_code, credit_name, what_to_submit, documentation_summary";
            const fallbackSelect = "project_id, id, credit_code, credit_name, what_to_submit";
            const attempt = yield this.admin
                .from("project_credits")
                .select(preferredSelect)
                .eq("project_id", projectId);
            if (!attempt.error) {
                return ((_a = attempt.data) !== null && _a !== void 0 ? _a : []);
            }
            if (String((_c = (_b = attempt.error) === null || _b === void 0 ? void 0 : _b.message) !== null && _c !== void 0 ? _c : "").toLowerCase().includes("documentation_summary")) {
                const fallback = yield this.admin
                    .from("project_credits")
                    .select(fallbackSelect)
                    .eq("project_id", projectId);
                if (!fallback.error) {
                    return ((_d = fallback.data) !== null && _d !== void 0 ? _d : []).map((row) => (Object.assign(Object.assign({}, row), { documentation_summary: null })));
                }
            }
            return [];
        });
    }
    upsertChunks(documentId, chunks) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!chunks.length)
                return;
            if (documentId) {
                yield this.admin.from("embeddings").delete().eq("document_id", documentId);
            }
            const rows = yield Promise.all(chunks.map((chunk) => __awaiter(this, void 0, void 0, function* () {
                return ({
                    document_id: documentId,
                    content: chunk.content,
                    embedding: toVectorLiteral(yield generateEmbedding(chunk.content)),
                    metadata: chunk.metadata,
                });
            })));
            yield this.admin.from("embeddings").insert(rows);
        });
    }
    ingestApprovedDocument(documentId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const { data: document } = yield this.admin
                .from("project_document")
                .select("id, project_id, project_credit_id, file_name, doc_category, notes, state")
                .eq("id", documentId)
                .eq("state", "APPROVED")
                .maybeSingle();
            if (!document)
                return;
            const credit = yield this.fetchCreditById(document.project_credit_id);
            const baseText = [
                `File: ${document.file_name}`,
                `Document type: ${document.doc_category}`,
                `Credit: ${(_a = credit === null || credit === void 0 ? void 0 : credit.credit_code) !== null && _a !== void 0 ? _a : "N/A"} ${(_b = credit === null || credit === void 0 ? void 0 : credit.credit_name) !== null && _b !== void 0 ? _b : ""}`,
                `Credit guidance: ${(_c = credit === null || credit === void 0 ? void 0 : credit.what_to_submit) !== null && _c !== void 0 ? _c : ""}`,
                `Documentation summary: ${(_d = credit === null || credit === void 0 ? void 0 : credit.documentation_summary) !== null && _d !== void 0 ? _d : ""}`,
                `Reviewer notes: ${(_e = document.notes) !== null && _e !== void 0 ? _e : ""}`,
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
            yield this.upsertChunks(document.id, chunks);
        });
    }
    ingestProjectGuidance(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const credits = yield this.fetchProjectCredits(projectId);
            if (!(credits === null || credits === void 0 ? void 0 : credits.length))
                return;
            const guidanceChunks = [];
            for (const credit of credits) {
                if (!credit)
                    continue;
                const text = [
                    `Credit: ${credit.credit_code} ${credit.credit_name}`,
                    `What to submit: ${(_a = credit.what_to_submit) !== null && _a !== void 0 ? _a : ""}`,
                    `Documentation summary: ${(_b = credit.documentation_summary) !== null && _b !== void 0 ? _b : ""}`,
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
            yield this.admin
                .from("embeddings")
                .delete()
                .contains("metadata", { source: "igbc_guidance", project_id: projectId });
            yield this.upsertChunks(null, guidanceChunks);
        });
    }
    /**
     * Ingest the actual PDF content of a project guidebook into the RAG embeddings store.
     * Called after every guidebook upload. Replaces any previous guidebook embeddings for this project.
     */
    ingestGuidebookPdf(params) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Download the PDF from Supabase Storage
            const { data: fileData, error: downloadError } = yield this.admin
                .storage
                .from("project-documents")
                .download(params.filePath);
            if (downloadError || !fileData) {
                console.error("[RAG] Failed to download guidebook for extraction:", downloadError);
                return;
            }
            // 2. Convert Blob → Buffer and extract text
            const arrayBuffer = yield fileData.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const rawText = yield (0, pdf_extractor_1.extractTextFromPdf)(buffer);
            const cleanedText = (0, pdf_extractor_1.cleanPdfText)(rawText);
            if (!cleanedText || cleanedText.length < 50) {
                console.warn("[RAG] Guidebook PDF yielded no usable text — skipping embedding.");
                return;
            }
            // 3. Compress using Headroom CCR interceptor to strip 80%+ of token noise
            const ccrResult = yield headroom_compressor_1.headroomCompressorService.compressReferenceGuide(cleanedText, params.guidebookId);
            console.log(`[RAG] Headroom compressed guidebook from ${ccrResult.originalTokens} to ${ccrResult.compressedTokens} tokens.`);
            // 4. Remove stale guidebook embeddings for this project
            yield this.admin
                .from("embeddings")
                .delete()
                .contains("metadata", { source: "guidebook_pdf", project_id: params.projectId });
            // 5. Chunk by paragraphs and embed the COMPRESSED CCR tokens instead of raw text
            const textChunks = chunkByParagraphs(ccrResult.compressedText, 900);
            const ragChunks = textChunks.map((content, idx) => ({
                content,
                metadata: {
                    source: "guidebook_pdf",
                    ccr_hash: ccrResult.ccrHash,
                    project_id: params.projectId,
                    guidebook_id: params.guidebookId,
                    file_name: params.fileName,
                    chunk_index: idx,
                    total_chunks: textChunks.length,
                },
            }));
            yield this.upsertChunks(null, ragChunks);
            console.log(`[RAG] Ingested ${ragChunks.length} chunks from guidebook "${params.fileName}" for project ${params.projectId}`);
        });
    }
    retrieveContext(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const queryEmbedding = yield generateEmbedding(params.query);
            const queryLower = params.query.toLowerCase();
            const creditCodeInQuery = extractCreditCode(params.query);
            const isCreditQuery = queryLower.includes("credit") ||
                queryLower.includes("igbc") ||
                queryLower.includes("what to submit") ||
                queryLower.includes("guidance");
            const limit = Math.max(1, Math.min((_a = params.limit) !== null && _a !== void 0 ? _a : 6, 12));
            if (!params.projectIds.length)
                return [];
            const { data: rows } = yield this.admin
                .from("embeddings")
                .select("content, embedding, metadata, created_at")
                .order("created_at", { ascending: false })
                .limit(500);
            const filtered = (rows !== null && rows !== void 0 ? rows : []).filter((row) => {
                var _a;
                const projectId = (_a = row === null || row === void 0 ? void 0 : row.metadata) === null || _a === void 0 ? void 0 : _a.project_id;
                return typeof projectId === "string" && params.projectIds.includes(projectId);
            });
            return filtered
                .map((row) => {
                var _a, _b, _c, _d, _e, _f;
                return ({
                    content: row.content,
                    metadata: row.metadata,
                    score: cosineSimilarity(queryEmbedding, parseVector(row.embedding)) +
                        (isCreditQuery && String((_b = (_a = row === null || row === void 0 ? void 0 : row.metadata) === null || _a === void 0 ? void 0 : _a.source) !== null && _b !== void 0 ? _b : "") === "igbc_guidance" ? 0.08 : 0) +
                        (creditCodeInQuery && String((_d = (_c = row === null || row === void 0 ? void 0 : row.metadata) === null || _c === void 0 ? void 0 : _c.credit_code) !== null && _d !== void 0 ? _d : "").toUpperCase() === creditCodeInQuery ? 0.2 : 0) +
                        // Boost real guidebook PDF content slightly so it surfaces alongside structured guidance
                        (String((_f = (_e = row === null || row === void 0 ? void 0 : row.metadata) === null || _e === void 0 ? void 0 : _e.source) !== null && _f !== void 0 ? _f : "") === "guidebook_pdf" ? 0.05 : 0),
                });
            })
                .filter((item) => Number.isFinite(item.score))
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
        });
    }
}
exports.RAGService = RAGService;
exports.ragService = new RAGService();
