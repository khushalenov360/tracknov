"use strict";
/**
 * Tracknov Document Intelligence - Semantic Duplicate Detector
 * Cross-references newly uploaded text against historical project documents to block evidence reuse.
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
exports.SemanticDuplicateDetector = void 0;
const semanticRetrievalEngine_1 = require("../intelligence/retrieval/semanticRetrievalEngine");
class SemanticDuplicateDetector {
    /**
     * Compares high-relevance matches across project to identify duplicates.
     */
    static detect(client, projectId, sampleText, excludeDocumentId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!sampleText || sampleText.trim().length < 50) {
                return { isDuplicate: false, highestSimilarity: 0.0 };
            }
            // Retrieve closest semantic chunks from database
            const matches = yield semanticRetrievalEngine_1.SemanticRetrievalEngine.retrieve(client, projectId, sampleText, 5);
            for (const match of matches) {
                if (excludeDocumentId && match.documentId === excludeDocumentId) {
                    continue;
                }
                // If the relevance similarity is above 0.95, it's virtually a copy-paste duplicate
                if (match.relevanceScore > 0.95) {
                    return {
                        isDuplicate: true,
                        duplicateDocumentId: match.documentId,
                        highestSimilarity: match.relevanceScore,
                        matchingSnippet: match.content.substr(0, 150) + "...",
                    };
                }
            }
            return {
                isDuplicate: false,
                highestSimilarity: matches.length > 0 ? matches[0].relevanceScore : 0.0,
            };
        });
    }
}
exports.SemanticDuplicateDetector = SemanticDuplicateDetector;
