import { createAdminClient } from "@/lib/supabase/admin";
import { ragService } from "../../services/rag-service";
import { ReasoningOutput } from "./reasoning-engine";

export class KnowledgeOntologyReasoner {
  public static async evaluate(query: string): Promise<ReasoningOutput> {
    const supabase = createAdminClient();
    const q = query.toLowerCase();

    const fallbackResponse: ReasoningOutput = {
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
    let evidenceType: string | null = null;
    const knownEvidenceTypes = ["DRAWING", "CALCULATION", "AREA_STATEMENT", "NARRATIVE", "PHOTO", "INVOICE", "SPECIFICATION", "ENERGY_MODEL", "WATER_CALCULATION"];
    for (const ev of knownEvidenceTypes) {
      if (q.includes(ev.toLowerCase()) || q.includes(ev.toLowerCase().replace("_", " "))) {
        evidenceType = ev;
        break;
      }
    }
    if (!evidenceType && q.includes("drawing")) evidenceType = "DRAWING";
    if (!evidenceType && q.includes("calculation")) evidenceType = "CALCULATION";
    if (!evidenceType && q.includes("narrative")) evidenceType = "NARRATIVE";
    if (!evidenceType && q.includes("photo")) evidenceType = "PHOTO";

    // Helper: fetch RAG content and return as answer when DB is empty
    async function ragFallback(credit: string | null, label: string): Promise<ReasoningOutput | null> {
      const ragQuery = credit ? `${credit} ${label}` : label;
      try {
        const ragMatches = await ragService.retrieveContext({
          query: ragQuery,
          projectIds: [],
          limit: 4,
        });
        if (!ragMatches || ragMatches.length === 0) return null;
        const combined = ragMatches.map(m => m.content).join("\n\n");
        return {
          consultantAssessment: combined,
          evidence: ragMatches.map(m => `Source: ${m.metadata?.source ?? "igbc_guidance"}`).join("; "),
          igbcInterpretation: `This information comes from IGBC guidance documents${credit ? ` for ${credit}` : ""}.`,
          risks: "Verify against the latest IGBC rating system version.",
          recommendations: "Cross-reference with project-specific conditions before submission."
        };
      } catch {
        return null;
      }
    }

    try {
      // --- Documents / Evidence Types Required ---
      const isDocumentQuery =
        q.includes("required for") || q.includes("what documents") ||
        q.includes("evidence types") || q.includes("what evidence") ||
        q.includes("valid for") || q.includes("what to submit") ||
        q.includes("documents needed") || q.includes("evidence valid");

      if (isDocumentQuery) {
        if (creditCode) {
          const { data: credit } = await supabase
            .from("knowledge_credit").select("id").eq("code", creditCode).maybeSingle();

          if (credit) {
            const { data: mappings } = await supabase
              .from("credit_evidence_mapping")
              .select("knowledge_evidence_type(name)")
              .eq("credit_id", credit.id);

            const reqDocs = mappings?.map((m: any) => m.knowledge_evidence_type?.name).filter(Boolean) || [];

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
        const rag = await ragFallback(creditCode, "documents evidence types required submit");
        if (rag) return rag;
        return { ...fallbackResponse, consultantAssessment: creditCode ? `Credit ${creditCode} not found. Please verify the credit code.` : fallbackResponse.consultantAssessment };
      }

      // --- Review Criteria ---
      const isReviewQuery =
        q.includes("review criteria") || q.includes("criteria apply") ||
        q.includes("approval criteria") || q.includes("reviewed against") ||
        q.includes("how is it reviewed") || q.includes("what criteria");

      if (isReviewQuery) {
        if (creditCode) {
          const { data: credit } = await supabase
            .from("knowledge_credit").select("id").eq("code", creditCode).maybeSingle();

          if (credit) {
            const { data: reviews } = await supabase
              .from("knowledge_review_criteria")
              .select("criteria_text")
              .eq("credit_id", credit.id);

            const criteria = reviews?.map((r: any) => r.criteria_text) || [];

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
        const rag = await ragFallback(creditCode, "review criteria approval checklist what reviewer checks");
        if (rag) return rag;
        return { ...fallbackResponse, consultantAssessment: creditCode ? `No review criteria seeded yet for ${creditCode}.` : fallbackResponse.consultantAssessment };
      }

      // --- Who Is Responsible / Who Uploads ---
      if (q.includes("who is responsible") || q.includes("who uploads") || q.includes("who creates") || q.includes("responsible for")) {
        if (evidenceType) {
          const action = q.includes("uploads") ? "UPLOADS" : "CREATES";
          const { data: evData } = await supabase
            .from("knowledge_evidence_type").select("id").eq("name", evidenceType).maybeSingle();

          if (evData) {
            let roleQuery = supabase
              .from("workflow_document_responsibility")
              .select("workflow_role(name), action")
              .eq("evidence_type_id", evData.id);

            if (q.includes("uploads")) roleQuery = roleQuery.eq("action", action);

            const { data: roleData } = await roleQuery;
            const justNames = Array.from(new Set(roleData?.map((r: any) => r.workflow_role?.name).filter(Boolean) || [])) as string[];
            const roles = roleData?.map((r: any) => `${r.workflow_role?.name} (${r.action})`) || [];

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
        const rag = await ragFallback(creditCode, `who is responsible uploads ${evidenceType ?? ""}`);
        return rag ?? fallbackResponse;
      }

      // --- Which Credits Use an Evidence Type ---
      if (q.includes("which credits use") && evidenceType) {
        const { data: evData } = await supabase
          .from("knowledge_evidence_type").select("id").eq("name", evidenceType).maybeSingle();

        if (evData) {
          const { data: credits } = await supabase
            .from("credit_evidence_mapping")
            .select("knowledge_credit(code)")
            .eq("evidence_type_id", evData.id);

          const creditCodes = credits?.map((c: any) => c.knowledge_credit?.code).filter(Boolean) || [];
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
          if (q.includes(r.toLowerCase())) { roleName = r; break; }
        }

        const { data: roleRow } = await supabase.from("workflow_role").select("id").eq("name", roleName).maybeSingle();
        if (roleRow) {
          const { data: docs } = await supabase
            .from("workflow_document_responsibility")
            .select("knowledge_evidence_type(name)")
            .eq("role_id", roleRow.id);

          const evNames = Array.from(new Set(docs?.map((d: any) => d.knowledge_evidence_type?.name).filter(Boolean) || [])) as string[];
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
        const rag = await ragFallback(null, `${roleName} responsibilities documents`);
        return rag ?? { ...fallbackResponse, consultantAssessment: `${roleName} has no mapped document responsibilities.` };
      }

      // --- Generic RAG fallback for any unrouted knowledge question ---
      const rag = await ragFallback(creditCode, query);
      if (rag) return rag;

    } catch (err) {
      console.error("[KnowledgeOntologyReasoner] Error:", err);
    }

    return fallbackResponse;
  }
}
