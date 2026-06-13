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
exports.detectDuplicates = detectDuplicates;
const uuid_1 = require("uuid");
const admin_1 = require("@/lib/supabase/admin");
const aiRuntimeAuditLogger_1 = require("@/lib/core/telemetry/aiRuntimeAuditLogger");
/**
 * TRACKNOV AI DUPLICATE EVIDENCE ENGINE
 *
 * Detects duplicate or near-duplicate uploads to maintain registry purity.
 */
function detectDuplicates(projectId, newDocumentId, hash) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        // 1. Check for exact hash match (Registry level)
        const { data: exactMatch } = yield admin
            .from("project_document")
            .select("id")
            .eq("project_id", projectId)
            .eq("hash", hash)
            .neq("id", newDocumentId)
            .limit(1);
        if (exactMatch && exactMatch.length > 0) {
            const duplicateReport = {
                documentA: newDocumentId,
                documentB: exactMatch[0].id,
                similarity: 1.0,
                type: "EXACT_HASH_MATCH"
            };
            yield admin.from("ai_duplicate_evidence_reports").insert({
                project_id: projectId,
                document_a_id: duplicateReport.documentA,
                document_b_id: duplicateReport.documentB,
                similarity_score: duplicateReport.similarity,
                detection_details: duplicateReport,
                trace_id: (0, uuid_1.v4)(),
                causality_chain_id: (0, uuid_1.v4)()
            });
            yield (0, aiRuntimeAuditLogger_1.logAiRecommendation)({
                projectId,
                recommendationType: "DUPLICATE_DETECTION",
                payload: duplicateReport,
                reasoning: "Exact hash collision detected in project registry."
            });
            return duplicateReport;
        }
        return null;
    });
}
