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
exports.KnowledgeOntologyReasoner = void 0;
const admin_1 = require("@/lib/supabase/admin");
const rag_service_1 = require("../../services/rag-service");
class KnowledgeOntologyReasoner {
    static evaluate(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const supabase = (0, admin_1.createAdminClient)();
            const q = query.toLowerCase();
            const fallbackResponse = {
                consultantAssessment: "I could not identify the specific credit or evidence type in your query.",
                evidence: "Missing parameters",
                igbcInterpretation: "General IGBC knowledge.",
                risks: "None",
                recommendations: "Please rephrase with a specific credit code (e.g. EDA C1) or evidence type (e.g. DRAWING)."
            };
            // 1. Identify Credit — supports "EDA C1", "EDAC1", "EDA-C1" patterns
            const creditMatch = query.match(/([a-zA-Z]{2,4}[\s\-]?[a-zA-Z]?\d+)/i);
            const creditCode = creditMatch ? creditMatch[1].replace(/[\s\-]/g, " ").toUpperCase().trim() : null;
            // 2. Identify Evidence Type
            let evidenceType = null;
            const knownEvidenceTypes = ["DRAWING", "CALCULATION", "AREA_STATEMENT", "NARRATIVE", "PHOTO", "INVOICE", "SPECIFICATION", "ENERGY_MODEL", "WATER_CALCULATION"];
            for (const ev of knownEvidenceTypes) {
                if (q.includes(ev.toLowerCase()) || q.includes(ev.toLowerCase().replace("_", " "))) {
                    evidenceType = ev;
                    break;
                }
            }
            if (!evidenceType && q.includes("drawing"))
                evidenceType = "DRAWING";
            if (!evidenceType && q.includes("calculation"))
                evidenceType = "CALCULATION";
            if (!evidenceType && q.includes("narrative"))
                evidenceType = "NARRATIVE";
            if (!evidenceType && q.includes("photo"))
                evidenceType = "PHOTO";
            // Helper: fetch RAG content and return as answer when DB is empty
            function ragFallback(credit, label) {
                return __awaiter(this, void 0, void 0, function* () {
                    const ragQuery = credit ? `${credit} ${label}` : label;
                    try {
                        const ragMatches = yield rag_service_1.ragService.retrieveContext({
                            query: ragQuery,
                            projectIds: [],
                            limit: 4,
                        });
                        if (!ragMatches || ragMatches.length === 0)
                            return null;
                        const combined = ragMatches.map(m => m.content).join("\n\n");
                        return {
                            consultantAssessment: combined,
                            evidence: ragMatches.map(m => { var _a, _b; return `Source: ${(_b = (_a = m.metadata) === null || _a === void 0 ? void 0 : _a.source) !== null && _b !== void 0 ? _b : "igbc_guidance"}`; }).join("; "),
                            igbcInterpretation: `This information comes from IGBC guidance documents${credit ? ` for ${credit}` : ""}.`,
                            risks: "Verify against the latest IGBC rating system version.",
                            recommendations: "Cross-reference with project-specific conditions before submission."
                        };
                    }
                    catch (_a) {
                        return null;
                    }
                });
            }
            try {
                // --- Documents / Evidence Types Required ---
                const isDocumentQuery = q.includes("required for") || q.includes("what documents") ||
                    q.includes("evidence types") || q.includes("what evidence") ||
                    q.includes("valid for") || q.includes("what to submit") ||
                    q.includes("documents needed") || q.includes("evidence valid");
                if (isDocumentQuery) {
                    if (creditCode) {
                        const { data: credit } = yield supabase
                            .from("knowledge_credit").select("id").eq("code", creditCode).maybeSingle();
                        if (credit) {
                            const { data: mappings } = yield supabase
                                .from("credit_evidence_mapping")
                                .select("knowledge_evidence_type(name)")
                                .eq("credit_id", credit.id);
                            const reqDocs = (mappings === null || mappings === void 0 ? void 0 : mappings.map((m) => { var _a; return (_a = m.knowledge_evidence_type) === null || _a === void 0 ? void 0 : _a.name; }).filter(Boolean)) || [];
                            if (reqDocs.length > 0) {
                                return {
                                    consultantAssessment: `The required evidence types for ${creditCode} are: ${reqDocs.join(", ")}.`,
                                    evidence: JSON.stringify(reqDocs),
                                    igbcInterpretation: "Verified from the Evidence Ontology mapping in the Knowledge Repository.",
                                    risks: "Ensure all evidence types are uploaded and correctly mapped.",
                                    recommendations: `Begin with ${reqDocs[0]} evidence first.`
                                };
                            }
                        }
                    }
                    // DB empty or no credit — fall back to RAG
                    const rag = yield ragFallback(creditCode, "documents evidence types required submit");
                    if (rag)
                        return rag;
                    return Object.assign(Object.assign({}, fallbackResponse), { consultantAssessment: creditCode ? `Credit ${creditCode} not found. Please verify the credit code.` : fallbackResponse.consultantAssessment });
                }
                // --- Review Criteria ---
                const isReviewQuery = q.includes("review criteria") || q.includes("criteria apply") ||
                    q.includes("approval criteria") || q.includes("reviewed against") ||
                    q.includes("how is it reviewed") || q.includes("what criteria");
                if (isReviewQuery) {
                    if (creditCode) {
                        const { data: credit } = yield supabase
                            .from("knowledge_credit").select("id").eq("code", creditCode).maybeSingle();
                        if (credit) {
                            const { data: reviews } = yield supabase
                                .from("knowledge_review_criteria")
                                .select("criteria_text")
                                .eq("credit_id", credit.id);
                            const criteria = (reviews === null || reviews === void 0 ? void 0 : reviews.map((r) => r.criteria_text)) || [];
                            if (criteria.length > 0) {
                                return {
                                    consultantAssessment: `Review criteria for ${creditCode}:\n` + criteria.join("\n"),
                                    evidence: JSON.stringify(criteria),
                                    igbcInterpretation: "Review criteria is the definitive checklist for credit approval.",
                                    risks: "Failure to meet any criterion blocks certification.",
                                    recommendations: "Align every document strictly with the stated criteria before submission."
                                };
                            }
                        }
                    }
                    // DB empty — fall back to RAG
                    const rag = yield ragFallback(creditCode, "review criteria approval checklist what reviewer checks");
                    if (rag)
                        return rag;
                    return Object.assign(Object.assign({}, fallbackResponse), { consultantAssessment: creditCode ? `No review criteria seeded yet for ${creditCode}.` : fallbackResponse.consultantAssessment });
                }
                // --- Who Is Responsible / Who Uploads ---
                if (q.includes("who is responsible") || q.includes("who uploads") || q.includes("who creates") || q.includes("responsible for")) {
                    if (evidenceType) {
                        const action = q.includes("uploads") ? "UPLOADS" : "CREATES";
                        const { data: evData } = yield supabase
                            .from("knowledge_evidence_type").select("id").eq("name", evidenceType).maybeSingle();
                        if (evData) {
                            let roleQuery = supabase
                                .from("workflow_document_responsibility")
                                .select("workflow_role(name), action")
                                .eq("evidence_type_id", evData.id);
                            if (q.includes("uploads"))
                                roleQuery = roleQuery.eq("action", action);
                            const { data: roleData } = yield roleQuery;
                            const justNames = Array.from(new Set((roleData === null || roleData === void 0 ? void 0 : roleData.map((r) => { var _a; return (_a = r.workflow_role) === null || _a === void 0 ? void 0 : _a.name; }).filter(Boolean)) || []));
                            const roles = (roleData === null || roleData === void 0 ? void 0 : roleData.map((r) => { var _a; return `${(_a = r.workflow_role) === null || _a === void 0 ? void 0 : _a.name} (${r.action})`; })) || [];
                            if (roles.length > 0) {
                                return {
                                    consultantAssessment: `${justNames.join(", ")} is responsible for ${evidenceType}.`,
                                    evidence: JSON.stringify(roles),
                                    igbcInterpretation: "Workflow responsibilities establish accountability across the project team.",
                                    risks: "None",
                                    recommendations: `Ping the ${justNames[0]} if this item is blocked.`
                                };
                            }
                        }
                    }
                    // DB empty — fall back to RAG
                    const rag = yield ragFallback(creditCode, `who is responsible uploads ${evidenceType !== null && evidenceType !== void 0 ? evidenceType : ""}`);
                    return rag !== null && rag !== void 0 ? rag : fallbackResponse;
                }
                // --- Which Credits Use an Evidence Type ---
                if (q.includes("which credits use") && evidenceType) {
                    const { data: evData } = yield supabase
                        .from("knowledge_evidence_type").select("id").eq("name", evidenceType).maybeSingle();
                    if (evData) {
                        const { data: credits } = yield supabase
                            .from("credit_evidence_mapping")
                            .select("knowledge_credit(code)")
                            .eq("evidence_type_id", evData.id);
                        const creditCodes = (credits === null || credits === void 0 ? void 0 : credits.map((c) => { var _a; return (_a = c.knowledge_credit) === null || _a === void 0 ? void 0 : _a.code; }).filter(Boolean)) || [];
                        return {
                            consultantAssessment: creditCodes.length > 0
                                ? `The evidence type ${evidenceType} is used in: ${creditCodes.join(", ")}.`
                                : `No credits currently mapped for ${evidenceType}.`,
                            evidence: JSON.stringify(creditCodes),
                            igbcInterpretation: "Multi-credit evidence mapping shows reuse potential.",
                            risks: "None",
                            recommendations: "Upload once to satisfy all linked credits."
                        };
                    }
                }
                // --- Role-specific document responsibilities ---
                if (q.includes("which documents is") || q.includes("documents is architect") || q.includes("responsible for uploading")) {
                    let roleName = "Architect";
                    const knownRoles = ["Architect", "MEP Consultant", "Contractor", "PMC", "Client", "Sustainability Consultant", "Project Manager"];
                    for (const r of knownRoles) {
                        if (q.includes(r.toLowerCase())) {
                            roleName = r;
                            break;
                        }
                    }
                    const { data: roleRow } = yield supabase.from("workflow_role").select("id").eq("name", roleName).maybeSingle();
                    if (roleRow) {
                        const { data: docs } = yield supabase
                            .from("workflow_document_responsibility")
                            .select("knowledge_evidence_type(name)")
                            .eq("role_id", roleRow.id);
                        const evNames = Array.from(new Set((docs === null || docs === void 0 ? void 0 : docs.map((d) => { var _a; return (_a = d.knowledge_evidence_type) === null || _a === void 0 ? void 0 : _a.name; }).filter(Boolean)) || []));
                        if (evNames.length > 0) {
                            return {
                                consultantAssessment: `${roleName} is responsible for: ${evNames.join(", ")}.`,
                                evidence: JSON.stringify(evNames),
                                igbcInterpretation: "Role mapping defines standard workload expectations.",
                                risks: "None",
                                recommendations: "Track these deliverables in the upload portal."
                            };
                        }
                    }
                    const rag = yield ragFallback(null, `${roleName} responsibilities documents`);
                    return rag !== null && rag !== void 0 ? rag : Object.assign(Object.assign({}, fallbackResponse), { consultantAssessment: `${roleName} has no mapped document responsibilities.` });
                }
                // --- Generic RAG fallback for any unrouted knowledge question ---
                const rag = yield ragFallback(creditCode, query);
                if (rag)
                    return rag;
            }
            catch (err) {
                console.error("[KnowledgeOntologyReasoner] Error:", err);
            }
            return fallbackResponse;
        });
    }
}
exports.KnowledgeOntologyReasoner = KnowledgeOntologyReasoner;
