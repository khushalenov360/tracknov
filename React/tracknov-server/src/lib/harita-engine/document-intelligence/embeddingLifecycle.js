"use strict";
/**
 * Tracknov Document Intelligence - Embedding Lifecycle Management
 * Enforces vector retention policies, eliminates stale indexes, and limits duplicate vector growth.
 */
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
exports.EmbeddingLifecycle = void 0;
class EmbeddingLifecycle {
    /**
     * Evaluates if a document needs embedding rebuild based on state modification timestamp.
     */
    static shouldRebuildEmbedding(lastCalculated, documentLastModified) {
        if (!lastCalculated)
            return true;
        const calcTime = new Date(lastCalculated).getTime();
        const modTime = new Date(documentLastModified).getTime();
        return modTime > calcTime;
    }
    /**
     * Purges orphan or stale embeddings that are no longer linked to active project documents.
     */
    static purgeStaleEmbeddings(client) {
        return __awaiter(this, void 0, void 0, function* () {
            // Select orphan embeddings that don't match any existing document ID
            const { data: orphans, error: selectError } = yield client
                .from("embeddings")
                .select("id, document_id");
            if (selectError || !orphans) {
                console.error("Embedding purge check failed:", selectError === null || selectError === void 0 ? void 0 : selectError.message);
                return 0;
            }
            let purgedCount = 0;
            for (const record of orphans) {
                if (!record.document_id)
                    continue;
                const { data: exists } = yield client
                    .from("project_document")
                    .select("id")
                    .eq("id", record.document_id)
                    .maybeSingle();
                if (!exists) {
                    yield client.from("embeddings").delete().eq("id", record.id);
                    purgedCount++;
                }
            }
            return purgedCount;
        });
    }
    /**
     * Enforces hard limits on the vector storage footprint to prevent infinite vector sprawl.
     */
    static enforceVectorLimits(client, projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { count, error } = yield client
                .from("embeddings")
                .select("id", { count: "exact", head: true })
                .eq("project_id", projectId);
            if (error) {
                console.error("Vector quota fetch error:", error.message);
                return false;
            }
            const totalVectors = count !== null && count !== void 0 ? count : 0;
            if (totalVectors >= this.MAX_VECTOR_LIMIT_PER_PROJECT) {
                console.warn(`[EMBEDDING_LIMIT] Project ${projectId} has reached the hard quota of ${this.MAX_VECTOR_LIMIT_PER_PROJECT} vectors.`);
                return false; // Quota exceeded, reject embedding generation
            }
            return true;
        });
    }
}
exports.EmbeddingLifecycle = EmbeddingLifecycle;
EmbeddingLifecycle.MAX_VECTOR_LIMIT_PER_PROJECT = 5000;
