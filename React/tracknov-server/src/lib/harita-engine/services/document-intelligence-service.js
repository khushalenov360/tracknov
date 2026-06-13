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
exports.documentIntelligenceService = exports.DocumentIntelligenceService = void 0;
const admin_1 = require("@/lib/supabase/admin");
const DocumentParser_1 = require("../document-intelligence/DocumentParser");
const DocumentClassifier_1 = require("../document-intelligence/DocumentClassifier");
const evidence_mapping_engine_1 = require("../intelligence/evidence/evidence-mapping-engine");
class DocumentIntelligenceService {
    constructor() {
        this.parser = new DocumentParser_1.DocumentParser();
        this.classifier = new DocumentClassifier_1.DocumentClassifier();
    }
    analyzeDocument(documentId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const supabase = (0, admin_1.createAdminClient)();
            // 1. Fetch document and related credit info
            const { data: doc } = yield supabase
                .from("project_document")
                .select("*, project_credits(*)")
                .eq("id", documentId)
                .maybeSingle();
            if (!doc || !doc.file_path) {
                throw new Error("Document or file path not found");
            }
            // 2. Download the file from Supabase Storage
            const { data: fileData, error: downloadError } = yield supabase.storage
                .from("project-documents")
                .download(doc.file_path);
            if (downloadError || !fileData) {
                console.error("Failed to download file from storage:", downloadError);
                throw new Error("Failed to download file from storage");
            }
            const buffer = Buffer.from(yield fileData.arrayBuffer());
            // 3. Parse and classify the document deterministically (NO AI)
            let parsedText = "";
            let evidenceType = "UNKNOWN";
            try {
                const parsed = yield this.parser.parse(buffer, doc.file_name);
                parsedText = parsed.text;
                evidenceType = this.classifier.classifyText(parsedText, doc.file_name);
            }
            catch (parseError) {
                console.error("Parsing failed:", parseError);
            }
            // 4. Construct the intelligence result
            const risks = [];
            if (doc.file_name.includes("draft")) {
                risks.push("Document marked as draft - verify final version before submission.");
            }
            // Add risk if the determined evidence type does not seem to match the expected category
            // For now we just record it.
            if (evidenceType !== "UNKNOWN" && doc.doc_category) {
                // In a real system, we'd cross check evidenceType against doc.doc_category
                // But for this MVP, we just include it in the summary.
            }
            const result = {
                summary: `Deterministically classified as: ${evidenceType}. Extracted ${parsedText.length} characters of text. Target Credit: ${((_a = doc.project_credits) === null || _a === void 0 ? void 0 : _a.credit_code) || "Unknown"}.`,
                relevanceScore: evidenceType !== "UNKNOWN" ? 95 : 50, // High confidence if we mapped it
                risks,
                suggestedNextSteps: ["Request Owner Approval", "Verify technical values against IGBC baseline"],
                evidenceType,
                parsedText: parsedText.slice(0, 1000) // Keep a snippet for debugging/summary
            };
            // 5. Query Evidence Mapping Engine
            const mappingResult = yield evidence_mapping_engine_1.EvidenceMappingEngine.evaluate(evidenceType);
            // 6. Store result in document_intelligence table
            yield supabase.from("document_intelligence").upsert({
                document_id: documentId,
                summary: result.summary,
                relevance_score: result.relevanceScore,
                risks: result.risks,
                next_steps: result.suggestedNextSteps,
                evidence_type: evidenceType,
                suggested_credits: mappingResult.suggestedCredits,
                responsible_roles: mappingResult.responsibleRoles,
                updated_at: new Date().toISOString(),
            });
            return result;
        });
    }
}
exports.DocumentIntelligenceService = DocumentIntelligenceService;
exports.documentIntelligenceService = new DocumentIntelligenceService();
